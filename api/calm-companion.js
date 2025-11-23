// /api/calm-companion.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mode, length } = req.body;

    // 🔹 Build the script prompt
    const prompt = buildPrompt(mode, length);

    // 🔹 Generate script using NEW OpenAI SDK
    const ai = await client.responses.create({
      model: "gpt-4.1",
      input: prompt
    });

    const text = ai.output_text || "Couldn't generate script.";

    // 🔹 Return text only for now (audio optional)
    return res.status(200).json({
      text,
      audio_base64: null   // (You can add TTS later)
    });

  } catch (err) {
    console.error("Calm Companion ERROR:", err);
    return res.status(500).json({
      error: "Calm Companion failed. Try again in a minute."
    });
  }
}

function buildPrompt(mode, length) {
  let duration = "4 minutes";

  if (length === "medium") duration = "8 minutes";
  if (length === "long") duration = "13 minutes";

  switch (mode) {
    case "anxiety":
      return `Create a soft, calming meditation for anxiety. Duration: ${duration}. Include gentle breathing cues, grounding, and reassurance. Tone: warm, slow.`;

    case "grounding":
      return `Create a slow, grounding meditation following the 5-4-3-2-1 method. Duration: ${duration}. Tone: calm and therapeutic.`;

    case "affirmations":
      return `Write a gentle sequence of affirmations for emotional safety and confidence. Duration: ${duration}. Tone: compassionate and soothing.`;

    case "sleep_story":
      return `Write a short, slow-paced sleep story that feels warm, soft, and safe. Duration: ${duration}. Make it like a bedtime meditation.`;

    default:
      return "Write a calming meditation in a slow, warm tone.";
  }
}
