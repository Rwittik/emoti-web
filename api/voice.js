// pages/api/voice.js  (or app/api/voice/route.js with small signature change)
import OpenAI from "openai";

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1️⃣ Read incoming audio from the request
    const arrayBuffer = await req.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: "audio/webm" });

    // 2️⃣ Transcribe with GPT-4o Transcribe
    const transcription = await client.audio.transcriptions.create({
      file: audioBlob,
      model: "gpt-4o-transcribe", // latest STT model :contentReference[oaicite:3]{index=3}
      // response_format: "json", // default returns { text: "..." }
    });

    const user_text = (transcription.text || "").trim();

    if (!user_text) {
      return new Response(
        JSON.stringify({
          error: "Could not understand audio",
          user_text: "",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3️⃣ Get EMOTI's reply (text)
    const chat = await client.chat.completions.create({
      model: "gpt-4.1-mini", // recommended small model now :contentReference[oaicite:4]{index=4}
      messages: [
        {
          role: "system",
          content:
            "You are EMOTI — an emotional support AI. Be warm, caring, and supportive. You are not a therapist, and you must encourage users in crisis to seek immediate human help.",
        },
        { role: "user", content: user_text },
      ],
    });

    const reply_text =
      chat.choices?.[0]?.message?.content ||
      "I’m here with you. Can you tell me a bit more about how you’re feeling? 💙";

    // 4️⃣ Convert reply text to speech
    const audio = await client.audio.speech.create({
      model: "gpt-4o-mini-tts", // TTS model :contentReference[oaicite:5]{index=5}
      voice: "coral", // use a supported voice
      input: reply_text,
      format: "mp3",
    });

    // 5️⃣ Turn binary audio into base64 without Buffer (Edge-safe)
    const audioArrayBuffer = await audio.arrayBuffer();
    const bytes = new Uint8Array(audioArrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = btoa(binary);

    return new Response(
      JSON.stringify({
        user_text,
        reply_text,
        audio: audioBase64,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Voice API error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Voice API failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
