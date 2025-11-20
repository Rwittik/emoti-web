export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, language, personality } = req.body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing API key" });
  }

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" }, // ⬅️ Ask OpenAI for JSON
        messages: [
          {
            role: "system",
            content: `
You are EMOTI — an emotional companion.

Respond ONLY as a strict JSON object with:
{
  "reply": "your warm short message",
  "emotion": "sad|angry|stressed|anxious|lonely|okay|happy"
}

Rules:
- reply = 1–3 sentences, warm, empathetic, no lectures.
- emotion = the user's emotional state.
- If user mentions self-harm, remind them to seek immediate help.
- DO NOT output anything outside the JSON object.
Speak like a ${personality} in ${language}.
            `,
          },
          { role: "user", content: text },
        ],
      }),
    });

    const data = await apiRes.json();
    const content = data?.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", content);

      parsed = {
        reply:
          "I’m here with you. Can you tell me a little more about how you're feeling?",
        emotion: "okay",
      };
    }

    return res.status(200).json({
      reply: parsed.reply,
      emotion: parsed.emotion,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "API request failed" });
  }
}
