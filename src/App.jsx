import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "emoti",
      text: "Hi, I’m EMOTI 💜 How are you feeling today?",
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);
  const boxRef = useRef();

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      from: "user",
      text: input,
      time: new Date(),
    };

    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMsg.text,
          language,
          personality,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm here, tell me more 💜";

      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          from: "emoti",
          text: reply,
          time: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((p) => [
        ...p,
        {
          id: Date.now() + 1,
          from: "emoti",
          text: "I'm having trouble replying. Please try again.",
          time: new Date(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        
        {/* LEFT PANEL */}
        <div className="bg-gradient-to-b from-purple-600 to-indigo-600 text-white p-8 flex flex-col justify-between">
          <div>
            <h1 className="text-5xl font-extrabold mb-4">EMOTI</h1>
            <p className="text-sm opacity-90">
              Your emotional companion — available 24/7
            </p>
          </div>

          <div className="mt-6">
            <label className="block text-sm mb-1">Language</label>
            <select
              className="w-full p-2 rounded bg-white text-black"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option>Hindi</option>
              <option>English</option>
              <option>Bengali</option>
              <option>Odia</option>
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Marathi</option>
            </select>

            <label className="block text-sm my-2">Personality</label>
            <select
              className="w-full p-2 rounded bg-white text-black"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
            >
              <option>Friend</option>
              <option>Mentor</option>
              <option>Sister</option>
              <option>Brother</option>
              <option>Soft Romantic</option>
            </select>
          </div>
        </div>

        {/* RIGHT CHAT PANEL */}
        <div className="md:col-span-2 flex flex-col p-6">
          <div
            ref={boxRef}
            className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-lg space-y-4"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.from === "user"
                    ? "text-right"
                    : "text-left"
                }
              >
                <div
                  className={`inline-block px-4 py-2 rounded-xl max-w-[80%] ${
                    m.from === "user"
                      ? "bg-purple-100"
                      : "bg-indigo-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="text-left">
                <div className="inline-block bg-indigo-100 px-4 py-2 rounded-xl">
                  Typing...
                </div>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 border rounded-lg p-3"
              placeholder="Write something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !loading ? sendMessage() : null
              }
            />
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg"
              onClick={sendMessage}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
