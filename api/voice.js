// api/voice.js
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false, // we read the raw stream ourselves
  },
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "POST only." });
  }

  try {
    // 0. Read raw binary body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      return res.status(400).json({ error: "Empty audio body" });
    }

    // Convert Buffer → Blob for OpenAI
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" });

    // 1. Speech-to-Text
    const transcription = await client.audio.transcriptions.create({
      file: audioBlob,
      model: "gpt-4o-transcribe",
    });

    const userText = (transcription.text || "").trim();
    console.log("Transcribed text:", userText);

    if (!userText) {
      return res.status(200).json({
        user_text: "",
        reply_text:
          "I couldn’t clearly hear anything. Could you try speaking again? 💙",
        audio: null,
      });
    }

    // 2. EMOTI reply
    const aiReply = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are EMOTI — a calm, warm emotional companion. Be short, kind, supportive. You are not a therapist; if user sounds in crisis, tell them to reach out to trusted people or local helplines.",
        },
        { role: "user", content: userText },
      ],
    });

    const replyText =
      aiReply.choices?.[0]?.message?.content?.trim() ||
      "I’m here with you. Can you tell me a bit more about how you feel? 💙";

    console.log("Reply text:", replyText);

    // 3. Text → Speech
    const tts = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: replyText,
      format: "mp3",
    });

    const ttsAudioBuffer = Buffer.from(await tts.arrayBuffer());

    // Respond with both text & audio
    res.status(200).json({
      user_text: userText,
      reply_text: replyText,
      audio: ttsAudioBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("Voice processing failed:", err);
    res
      .status(500)
      .json({ error: "Voice processing failed", detail: String(err) });
  }
}
