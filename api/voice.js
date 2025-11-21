// api/voice.js
import OpenAI, { toFile } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// (This `config` is only used by Next.js, but harmless on Vercel)
export const config = {
  api: {
    bodyParser: false, // we read the raw stream ourselves
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "POST only." });
  }

  try {
    // 0. Read raw binary body from the request
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      return res.status(400).json({ error: "Empty audio body" });
    }

    // 1) Convert Buffer → File for OpenAI (recommended pattern)
    const file = await toFile(audioBuffer, "recording.webm", {
      contentType: "audio/webm",
    });

    // 2) Speech-to-text
    const transcription = await client.audio.transcriptions.create({
      file,
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

    // 3) EMOTI reply (text)
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

    // 4) Text → speech
    const tts = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: replyText,
      format: "mp3",
    });

    const ttsAudioBuffer = Buffer.from(await tts.arrayBuffer());

    // Respond with both text & audio (base64)
    return res.status(200).json({
      user_text: userText,
      reply_text: replyText,
      audio: ttsAudioBuffer.toString("base64"),
    });
  } catch (err) {
    console.error("Voice processing failed:", err);
    return res
      .status(500)
      .json({ error: "Voice processing failed", detail: String(err) });
  }
}
