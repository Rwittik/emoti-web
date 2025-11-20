// mock-server.js — Express mock with GET for browser check + POST for UI
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors()); // allow all origins (dev only)
app.use(bodyParser.json());

// GET for quick browser check
app.get("/api/chat", (req, res) => {
  res.send("EMOTI Mock API — POST JSON to /api/chat to get a reply.");
});

// POST for chat UI
app.post("/api/chat", (req, res) => {
  const { text = "", language = "Hindi", personality = "Friend" } = req.body || {};
  const reply = `(${language} / ${personality}) EMOTI: I heard you say "${String(text).slice(0,120)}". Tell me a bit more.`;
  res.json({ reply });
});

const port = 5174;
app.listen(port, () => console.log(`Mock API running at http://localhost:${port}/api/chat`));
