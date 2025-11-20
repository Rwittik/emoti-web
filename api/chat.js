// api/chat.js  — Vercel serverless function for EMOTI
// Uses Node 18+ global fetch

const URGENT_REGEX =
  /suicide|kill myself|end my life|want to die|harm myself|self[- ]?harm|hurt myself|cut myself/i;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { text = "", language = "Hindi", personality = "Friend" } =
      req.body || {};

    if (!text.trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Basic urgent check
    if (URGENT_REGEX.test(text)) {
      return res.json({
        reply:
          "I'm really sorry you're feeling this way. I can't handle emergencies, but you're not alone. " +
          "If you're in immediate danger, contact local emergency services. In India you can also reach mental health helplines. " +
          "Would you like some ideas for small steps you can take right now while you reach out for help?",
      });
    }

    const systemPrompt = `You are EMOTI, an empathetic, non-judgmental emotional companion for Indian users.
Speak in the user's preferred language when possible. Keep responses short (1–3 sentences), warm, and culturally sensitive.
Avoid medical, legal or explicit sexual advice. Encourage professional help and helplines for serious issues or self-harm thoughts.
Personality: ${personality}.`;

    const userPrompt = `User language preference: ${language}
User message: ${text}
Respond concisely in the requested tone.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.error("OpenAI error", openaiRes.status, txt);
      return res.status(502).json({ error: "AI provider error" });
    }

    const data = await openaiRes.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();

    if (!reply) {
      return res.json({
        reply: "I'm here with you. Can you share a bit more about what's going on?",
      });
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Server error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
