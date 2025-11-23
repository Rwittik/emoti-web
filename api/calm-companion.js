// /api/calm-companion.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Calm Companion: missing OPENAI_API_KEY");
    return res
      .status(500)
      .json({ error: "Server is not configured for Calm Companion yet." });
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    // -----------------------------
    // 1) Build script prompt
    // -----------------------------
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

    // -----------------------------
    // 2) Generate the text script
    // -----------------------------
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Create the calm companion script now." },
        ],
        temperature: 0.8,
        max_tokens: 900,
      }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      console.error("Calm Companion chat error:", chatRes.status, errText);
      return res.status(500).json({
        error: "I couldn’t build a calm script right now. Please try again.",
      });
    }

    const chatData = await chatRes.json();
    const script =
      chatData?.choices?.[0]?.message?.content?.trim() ||
      "Take a slow breath in… and a gentle breath out.";

    // -----------------------------
    // 3) Generate TTS audio via /v1/audio/speech
    // -----------------------------
    let audio_base64 = null;

    try {
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "tts-1",          // stable TTS model
          input: script,
          voice: "alloy",
          response_format: "mp3",  // we’ll return mp3 data
        }),
      });

      if (!ttsRes.ok) {
        const errText = await ttsRes.text();
        console.error("Calm Companion TTS HTTP error:", ttsRes.status, errText);
      } else {
        const arrayBuffer = await ttsRes.arrayBuffer();
        audio_base64 = Buffer.from(arrayBuffer).toString("base64");
      }
    } catch (ttsErr) {
      console.error("Calm Companion TTS network error:", ttsErr);
      // we still continue with text-only script
    }

    // -----------------------------
    // 4) Respond to frontend
    // -----------------------------
    return res.status(200).json({
      text: script,
      audio_base64, // may be null if TTS failed
    });
  } catch (err) {
    console.error("Calm Companion API error:", err);
    return res.status(500).json({
      error: "Calm Companion internal error",
    });
  }
}
