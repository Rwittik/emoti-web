// /api/calm-companion.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    // This is what will happen on Vercel if the key is missing
    return res
      .status(500)
      .json({ error: "Calm Companion is not configured on the server yet." });
  }

  try {
    const { mode = "anxiety", length = "short" } = req.body || {};

    // Rough length instructions
    let lengthHint = "around 3–5 minutes of slow reading";
    if (length === "medium") lengthHint = "around 7–10 minutes of slow reading";
    if (length === "long") lengthHint = "around 12–15 minutes of slow reading";

    let prompt;

    switch (mode) {
      case "grounding":
        prompt = `
You are EMOTI Calm Companion, a very gentle voice.
Create a slow, soothing 5-4-3-2-1 grounding exercise that takes ${lengthHint}.
Write it as if you are speaking directly to the listener, in second person ("you").
Include short pauses like "(pause)" occasionally.
Avoid medical claims.
`;
        break;

      case "affirmations":
        prompt = `
You are EMOTI Calm Companion, a soft and kind voice.
Create a series of short calming affirmations that together take ${lengthHint} to read slowly.
Group them into 3–4 mini sections with tiny one-line intros like "For your self-worth:".
Keep each affirmation 1 short sentence.
Avoid any medical or unrealistic promises.
`;
        break;

      case "sleep_story":
        prompt = `
You are EMOTI Calm Companion, whisper-soft.
Write a relaxing bedtime story that takes ${lengthHint} to read.
Set it in a peaceful, safe place (like by the sea, a quiet hill, or under the stars).
Use very simple language and gentle imagery.
No plot twists, just a slow drift into calm.
End with a soft closing like "You can rest now."
`;
        break;

      case "anxiety":
      default:
        prompt = `
You are EMOTI Calm Companion, speaking slowly and kindly.
Create a gentle script to help lower anxiety that takes ${lengthHint} to read.
Include:
- a short validation of feelings,
- 2–3 rounds of simple breathing instructions,
- 1 mini grounding exercise,
- and 3–4 tiny reassuring lines at the end.
Avoid medical advice or diagnoses.
Use second person ("you") and keep the tone warm and non-judgmental.
`;
        break;
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const text = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      text,
      // audio_base64: null // you can add TTS here later
    });
  } catch (err) {
    console.error("Calm Companion API error:", err);
    return res.status(500).json({
      error:
        "I couldn’t start a calm session just now. EMOTI’s calm server had a problem.",
    });
  }
}
