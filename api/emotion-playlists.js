// api/emotion-playlists.js

// Small helper to map your UI mood ids to nicer search keywords
const MOOD_SEARCH_MAP = {
  chill: "chill calm lo-fi",
  sad: "sad comforting emotional",
  focus: "focus study concentration lo-fi",
  uplifting: "happy uplifting positive",
};

function buildSearchQuery(mood, language) {
  const moodKey = MOOD_SEARCH_MAP[mood] || "mood";
  const lang = language && language.toLowerCase() !== "mix" ? language : "";
  // Example query: "chill calm lo-fi hindi playlist"
  return `${moodKey} ${lang} playlist`.trim();
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mood = "chill", language = "Mix" } = req.query || {};

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Spotify env vars");
      return res
        .status(500)
        .json({ error: "Spotify credentials are not configured" });
    }

    // 1) Get access token via Client Credentials flow
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        // node 18+ has Buffer globally, works on Vercel
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error("Spotify token error:", tokenRes.status, txt);
      return res
        .status(500)
        .json({ error: "Could not authenticate with Spotify" });
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      console.error("No access_token in token response:", tokenJson);
      return res
        .status(500)
        .json({ error: "Invalid Spotify token response" });
    }

    // 2) Search for playlists
    const query = buildSearchQuery(mood, language);

    const searchUrl =
      "https://api.spotify.com/v1/search?" +
      new URLSearchParams({
        q: query,
        type: "playlist",
        limit: "9",
      }).toString();

    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      const txt = await searchRes.text();
      console.error("Spotify search error:", searchRes.status, txt);
      return res.status(500).json({ error: "Failed to fetch playlists" });
    }

    const json = await searchRes.json();

    // 3) Normalize playlists into a safe, frontend-friendly shape
    const rawItems = Array.isArray(json.playlists?.items)
      ? json.playlists.items
      : [];

    const playlists = rawItems
      // remove null/undefined or objects without basic fields
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.id &&
          item.name
      )
      .map((item) => ({
        id: item.id,
        title: item.name,
        description: item.description || "",
        image: Array.isArray(item.images) && item.images[0]?.url
          ? item.images[0].url
          : null,
        url: item.external_urls?.spotify || null,
        trackCount:
          item.tracks && typeof item.tracks.total === "number"
            ? item.tracks.total
            : null,
      }));

    return res.status(200).json({ playlists });
  } catch (err) {
    console.error("Emotion playlists API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
