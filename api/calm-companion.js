// /api/calm-companion.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    // length hint text
    let lengthHint = "";
    if (length === "short") lengthHint = "around 3–5 minutes of spoken content";
    else if (length === "medium") lengthHint = "around 7–10 minutes";
    else if (length === "long") lengthHint = "around 12–15 minutes";

    let prompt;

    switch (mode) {
      case "affirmations":
        prompt = `
You are EMOTI Calm Companion. Speak in a very soft, gentle tone.
Give a sequence of 6–8 short calming affirmations.
Keep each line brief and soothing.
Aim for ${lengthHint}.
`;
        break;

      case "grounding":
        prompt = `
You are EMOTI Calm Companion guiding a 5-4-3-2-1 grounding exercise.
Speak slowly and gently.
Walk the listener step-by-step through noticing 5 things they can see,
4 they can touch, 3 they can hear, 2 they can smell, and 1 they can taste or feel inside.
Include occasional breathing cues. Aim for ${lengthHint}.
`;
        break;

      case "sleep_story":
        prompt = `
You are EMOTI Calm Companion telling a very soft, cozy sleep story.
Use simple language, slow pacing, and relaxing imagery.
No horror, no tension, just safety and warmth.
Write a continuous script that could be read in ${lengthHint}.
`;
        break;

      case "anxiety":
      default:
        prompt = `
You are EMOTI Calm Companion helping someone with anxiety.
Speak softly and validate their feelings.
Guide them through a short breathing exercise and gentle reassurance.
Avoid medical advice. Aim for ${lengthHint}.
`;
        break;
    }

    // 1) create calming script text
    const completion = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      completion.choices?.[0]?.message?.content ||
      "Take a slow breath in, and a slow breath out. You are safe here.";

    // 2) optional: turn script into calm audio
    let audio_base64 = null;
    try {
      const speech = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "alloy", // or another gentle voice
        input: text,
      });

      const buffer = Buffer.from(await speech.arrayBuffer());
      audio_base64 = buffer.toString("base64");
    } catch (ttsErr) {
      console.error("TTS failed for calm companion:", ttsErr);
      // We still return text even if audio fails
    }

    return res.status(200).json({
      text,
      audio_base64,
    });
  } catch (err) {
    console.error("Calm Companion error:", err);
    return res.status(500).json({ error: "Calm Companion failed" });
  }
}
