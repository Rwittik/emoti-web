// /api/calm-companion.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Calm Companion: missing OPENAI_API_KEY");
    return res.status(500).json({
      error: "Server is not configured for Calm Companion yet.",
    });
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    // --- Build a mode description (what kind of script we want) ---
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

    // --- Length hint (rough size / duration) ---
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

Write it as one continuous script in the second person ("you"),
with line breaks where a natural pause would happen.
Do NOT mention that you are an AI.
`.trim();

    // ---------- 1) Call OpenAI like your existing /api/chat route ----------
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // same model as chat.js (known to work for you)
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Create the full Calm Companion script now.",
          },
        ],
        temperature: 0.8,
        max_tokens: 900,
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text().catch(() => "");
      console.error(
        "Calm Companion OpenAI error:",
        apiRes.status,
        apiRes.statusText,
        errBody
      );
      return res.status(500).json({
        error:
          "I couldn't start a calm session just now. The server may be busy.",
      });
    }

    const data = await apiRes.json();
    const script =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Take a slow breath in… and a gentle breath out. You are safe in this moment.";

    // For now we only return text. If you later add TTS, you can include audio_base64 again.
    return res.status(200).json({
      text: script,
      audio_base64: null,
    });
  } catch (err) {
    console.error("Calm Companion API error:", err);
    return res.status(500).json({
      error:
        "I couldn't start a calm session just now. Please try again in a minute.",
    });
  }
}
