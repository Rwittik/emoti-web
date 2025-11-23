// /api/calm-companion.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    let modePrompt = "";
    switch (mode) {
      case "anxiety":
        modePrompt =
          "Create a very gentle, second-person script to help someone lower anxiety. " +
          "Start by validating their feelings, then guide them through slow breathing and a few grounding cues.";
        break;
      case "grounding":
        modePrompt =
          "Guide the listener through a 5-4-3-2-1 grounding exercise. " +
          "Use a warm, calm tone and short sentences they can follow with eyes closed.";
        break;
      case "affirmations":
        modePrompt =
          "Write a series of short, calming affirmations in second person. " +
          "They should feel safe, accepting, and not overly cheesy.";
        break;
      case "sleep_story":
        modePrompt =
          "Write a soft sleep story that slowly helps the listener unwind. " +
          "Use gentle imagery (night sky, quiet room, soft breeze) and a very slow, soothing tone.";
        break;
      default:
        modePrompt =
          "Speak as a calm, caring companion. Offer a short guided relaxation.";
        break;
    }

    let lengthPrompt = "";
    if (length === "short") {
      lengthPrompt =
        " Keep it around 3–5 minutes when spoken, and avoid long paragraphs.";
    } else if (length === "medium") {
      lengthPrompt =
        " Aim for about 7–10 minutes when spoken, with a gradual, gentle pace.";
    } else if (length === "long") {
      lengthPrompt =
        " Aim for about 12–15 minutes when spoken. Stay calm, slow, and repetitive in a soothing way.";
    }

    const prompt =
      "You are EMOTI Calm Companion, a soft AI voice that never panics or judges.\n\n" +
      modePrompt +
      lengthPrompt +
      "\n\nWrite the response as if it will be read aloud. Use simple, slow sentences and occasional pauses like '(pause)'.";

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "Take a slow breath in, hold gently, and let it out. You are safe in this moment.";

    // For now we only send text. If you later add TTS, also send audio_base64 here.
    res.status(200).json({ text: reply });
  } catch (err) {
    console.error("Calm Companion error:", err);
    res.status(500).json({
      error:
        "Calm Companion failed. Please try again in a little while or use text chat instead.",
    });
  }
}
