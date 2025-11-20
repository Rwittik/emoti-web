// api/voice.js
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only." });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audioBuffer = Buffer.concat(chunks);

    // 1. Speech-to-Text
    const transcription = await client.audio.transcriptions.create({
      file: {
        buffer: audioBuffer,
        mimetype: "audio/webm",
        filename: "voice.webm",
      },
      model: "gpt-4o-transcribe",
    });

    const userText = transcription.text || "";

    // 2. EMOTI reply
    const aiReply = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are EMOTI — a calm, warm emotional companion. Be short, kind, supportive.",
        },
        { role: "user", content: userText },
      ],
    });

    const replyText = aiReply.choices[0].message.content;

    // 3. Text → Speech
    const tts = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: replyText,
      format: "mp3",
    });

    const ttsAudio = Buffer.from(await tts.arrayBuffer());

    // Respond with both text & audio
    res.status(200).json({
      user_text: userText,
      reply_text: replyText,
      audio: ttsAudio.toString("base64"),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Voice processing failed" });
  }
}
