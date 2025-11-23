// /api/calm-companion.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Calm Companion: missing OPENAI_API_KEY");
    return res.status(500).json({
      error: "Server is not configured for Calm Companion yet.",
    });
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    // --- build a style + length hint ---
    let modeDescription;
    switch (mode) {
      case "grounding":
        modeDescription =
          "Guide the listener through a slow 5-4-3-2-1 grounding exercise with gentle breathing reminders.";
        break;
      case "affirmations":
        modeDescription =
          "Speak in short, clear, soothing affirmations with small pauses between each one.";
        break;
      case "sleep_story":
        modeDescription =
          "Tell a very soft, dreamy bedtime story that makes the listener feel safe and sleepy.";
        break;
      case "anxiety":
      default:
        modeDescription =
          "Help lower anxiety with slow breathing cues, validation, and tiny steps of reassurance.";
        break;
    }

    let lengthHint;
    switch (length) {
      case "medium":
        lengthHint = "Keep it around 7–10 minutes of audio length.";
        break;
      case "long":
        lengthHint = "Keep it around 12–15 minutes of audio length.";
        break;
      case "short":
      default:
        lengthHint = "Keep it around 3–5 minutes of audio length.";
        break;
    }

    const systemPrompt = `
You are EMOTI Calm Companion, a very gentle voice that sounds like a kind older friend.
You always:
- Speak slowly, softly and with warmth.
- Use simple language that feels safe.
- Avoid triggering or intense imagery.
- Never give medical advice or promise to cure anything.

Write a script that EMOTI could read out loud.
Mode description: ${modeDescription}
Session length hint: ${lengthHint}

Write it as one continuous script in the second person ("you"), with line breaks where a natural pause would happen.
Do NOT mention that you are an AI.
    `.trim();

    // ---------- 1) Generate text script ----------
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Create the calm companion script now." },
      ],
      temperature: 0.8,
      max_tokens: 900,
    });

    const script =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Take a slow breath in… and a gentle breath out.";

    // ---------- 2) Try to generate audio (optional) ----------
    let audio_base64 = null;
    try {
      const speech = await client.audio.speech.create({
        model: "gpt-4o-mini-tts", // text-to-speech model
        voice: "alloy",
        input: script,
        format: "mp3",
      });

      const buffer = Buffer.from(await speech.arrayBuffer());
      audio_base64 = buffer.toString("base64");
    } catch (ttsErr) {
      // If TTS fails, we still return the text script so UI works
      console.error("Calm Companion TTS error:", ttsErr);
    }

    return res.status(200).json({
      text: script,
      audio_base64,
    });
  } catch (err) {
    console.error("Calm Companion API error:", err);
    return res.status(500).json({
      error: "Calm Companion internal error",
    });
  }
}
