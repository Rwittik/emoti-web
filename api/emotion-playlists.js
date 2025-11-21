// api/emotion-playlists.js
// Vercel serverless function / Next.js pages/api style

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Map EMOTI mood + language → Spotify search keywords
function buildSearchQuery(mood, language) {
  let moodPart = "chill";

  switch (mood) {
    case "sad":
      moodPart = "sad comforting";
      break;
    case "focus":
      moodPart = "lofi focus study";
      break;
    case "uplifting":
      moodPart = "happy uplifting";
      break;
    case "chill":
    default:
      moodPart = "chill calm";
  }

  let langPart = "";
  const lower = (language || "").toLowerCase();

  if (["hindi", "english", "bengali", "odia", "tamil", "telugu", "marathi"].includes(lower)) {
    langPart = ` ${lower}`;
  }

  return `${moodPart}${langPart}`.trim();
}

// Get an app access token via Spotify client credentials flow
async function getSpotifyToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars");
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("Spotify token error:", resp.status, text);
    throw new Error("Failed to get Spotify token");
  }

  const json = await resp.json();
  return json.access_token;
}

// Main handler
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mood = "chill", language = "Mix" } = req.query;

    const token = await getSpotifyToken();

    const query = buildSearchQuery(mood, language);
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "playlist");
    searchUrl.searchParams.set("limit", "6");

    const resp = await fetch(searchUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Spotify search error:", resp.status, text);
      return res.status(500).json({ error: "Spotify search failed" });
    }

    const data = await resp.json();
    const items = data.playlists?.items || [];

    const playlists = items.map((pl) => ({
      id: pl.id,
      title: pl.name,
      description: pl.description,
      url: pl.external_urls?.spotify || "",
      image: pl.images?.[0]?.url || "",
      trackCount: pl.tracks?.total ?? null,
      // We don't have full length here; you can extend later if needed
      lengthText: pl.tracks?.total ? `${pl.tracks.total} tracks` : "Spotify playlist",
    }));

    return res.status(200).json({ playlists });
  } catch (err) {
    console.error("emotion-playlists handler error:", err);
    return res.status(500).json({ error: "Failed to load playlists" });
  }
}
