// src/components/Journal.jsx
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "journalEntries"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
    return () => unsub();
  }, [user]);

  const addEntry = async () => {
    if (!text.trim() || !user) return;
    await addDoc(collection(db, "users", user.uid, "journalEntries"), {
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Sign in to save your chats as a private journal.
      </p>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-6">
      <h3 className="text-sm font-semibold mb-2">Your Journal</h3>
      <textarea
        className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a reflection about today..."
      />
      <button
        onClick={addEntry}
        className="mt-2 px-3 py-1.5 text-xs rounded-full bg-sky-500 text-slate-950"
      >
        Save entry
      </button>

      <div className="mt-4 space-y-2 text-xs">
        {entries.map((e) => (
          <div
            key={e.id}
            className="border border-slate-800 rounded-lg p-2 bg-slate-900/70"
          >
            <div className="text-slate-300 whitespace-pre-wrap">
              {e.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
