/* ═══════════════════════════════════════════════════════
   J.A.R.V.I.S — SPOTIFY INTEGRATION (REAL, no secret)
   PKCE OAuth flow — sirf public Client ID chahiye (safe).
   - Free plan: search + playlists + Spotify app mein kholna
   - Premium: direct playback control bhi (Player API ready)
   Tokens localStorage mein (local app — koi server nahi).
   ═══════════════════════════════════════════════════════ */
"use strict";

window.SPOTIFY = (function () {

  const LS_TOK      = "jarvis_spotify_tokens_v1";
  const LS_CID      = "jarvis_spotify_cid";
  const LS_VERIFIER = "jarvis_spotify_verifier_v1";
  const LS_STATE    = "jarvis_spotify_state_v1";
  const LS_FLAG     = "jarvis_spotify_flag_v1";

  const AUTH_URL  = "https://accounts.spotify.com/authorize";
  const TOKEN_URL = "https://accounts.spotify.com/api/token";
  const API_URL   = "https://api.spotify.com/v1";
  const SCOPES = "user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state";

  function loadJSON(k, def) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? def : v; } catch (e) { return def; }
  }
  function saveJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ }
  }
  function getClientId() {
    return String(localStorage.getItem(LS_CID) || "").trim();
  }
  function setClientId(v) {
    try { localStorage.setItem(LS_CID, String(v || "").trim()); } catch (e) { /* noop */ }
  }
  function getRedirectUri() {
    // Spotify (Nov 2025 se) "localhost" allow nahi karta — loopback IP (127.0.0.1)
    // HTTP ke saath chalta hai. Isliye app 127.0.0.1 se serve hoti hai (server.py).
    return location.origin + "/api/spotify/callback";
  }
  function isConnected() {
    const t = loadJSON(LS_TOK, null);
    return !!(t && t.access_token);
  }
  function getUser() {
    const t = loadJSON(LS_TOK, null);
    return (t && t.user) || null;
  }

  /* ── PKCE helpers ── */
  function b64url(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function randStr(len) {
    const a = new Uint8Array(len);
    crypto.getRandomValues(a);
    let s = "";
    for (let i = 0; i < len; i++) s += String.fromCharCode(a[i]);
    return b64url(new TextEncoder().encode(s)).slice(0, len);
  }
  async function sha256(s) {
    return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  }

  /* ── Token management ── */
  async function tokenFetch(body) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  async function refreshToken() {
    const t = loadJSON(LS_TOK, null);
    if (!t || !t.refresh_token) return null;
    try {
      const body = new URLSearchParams();
      body.set("grant_type", "refresh_token");
      body.set("refresh_token", t.refresh_token);
      body.set("client_id", getClientId());
      const d = await tokenFetch(body);
      t.access_token = d.access_token;
      t.expires_at = Date.now() + (d.expires_in || 3600) * 1000;
      if (d.refresh_token) t.refresh_token = d.refresh_token;
      saveJSON(LS_TOK, t);
      return d.access_token;
    } catch (e) { return null; }
  }

  async function getAccessToken() {
    const t = loadJSON(LS_TOK, null);
    if (!t || !t.access_token) return null;
    if (t.expires_at && Date.now() > t.expires_at - 60000) {
      const refreshed = await refreshToken();
      return refreshed;
    }
    return t.access_token;
  }

  async function api(path, opts) {
    let tok = await getAccessToken();
    if (!tok) throw new Error("SPOTIFY_NOT_CONNECTED");
    const res = await fetch(API_URL + path, {
      headers: { Authorization: "Bearer " + tok },
      ...(opts || {})
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      if (res.status === 401) {
        tok = await refreshToken();
        if (!tok) throw new Error("SPOTIFY_AUTH_FAILED");
        const r2 = await fetch(API_URL + path, { headers: { Authorization: "Bearer " + tok }, ...(opts || {}) });
        if (!r2.ok) throw new Error("HTTP " + r2.status);
        return r2.status === 204 ? null : await r2.json();
      }
      throw new Error("HTTP " + res.status);
    }
    return await res.json();
  }

  /* ── Connect (PKCE) ── */
  // Redirect URI host: 127.0.0.1 (Spotify "localhost" reject karta hai).
  // getRedirectUri() location.origin se banati hai, isliye app 127.0.0.1 se khulni chahiye.
  function connect() {
    const cid = getClientId();
    if (!cid) return { ok: false, msg: "Pehle Settings → Spotify mein apna Client ID daalo (developer.spotify.com se, free)." };
    if (!/^https?:$/.test(location.protocol)) {
      return { ok: false, msg: "Spotify ko local server chahiye, sir — start.bat se chalao (file:// se OAuth nahi chalta)." };
    }
    if (!window.crypto || !window.crypto.subtle) {
      setFlag("crypto_unavailable");
      return { ok: false, msg: "Yahan crypto.subtle available nahi hai, sir — app ko start.bat se (http://127.0.0.1:8000) chalao, phir CONNECT try karo." };
    }
    if (location.hostname === "localhost") {
      return { ok: false, msg: "Spotify ab \"localhost\" redirect URI allow nahi karta, sir (Nov 2025 se) — sirf loopback IP chalta hai. App ko http://127.0.0.1:8000 se kholo (server band karke start.bat dobara chalao — wo khud 127.0.0.1 kholega), phir CONNECT karo." };
    }
    const verifier = randStr(64);
    const state = randStr(24);
    try { localStorage.setItem(LS_VERIFIER, verifier); localStorage.setItem(LS_STATE, state); } catch (e) { /* noop */ }

    sha256(verifier).then(buf => {
      const challenge = b64url(buf);
      const params = new URLSearchParams({
        client_id: cid,
        response_type: "code",
        redirect_uri: getRedirectUri(),
        scope: SCOPES,
        state: state,
        code_challenge_method: "S256",
        code_challenge: challenge
      });
      window.location.href = AUTH_URL + "?" + params.toString();
    }).catch(() => {
      // crypto.subtle unavailable (non-secure context) — user ko batao
      setFlag("crypto_unavailable");
    });
    return { ok: true, msg: "Spotify login window khul rahi hai — wahan Allow dabao, phir JARVIS connect ho jayega." };
  }

  /* Callback page (server.py /api/spotify/callback) se call hota hai */
  async function handleCallback(code, state) {
    const savedState = localStorage.getItem(LS_STATE);
    const verifier = localStorage.getItem(LS_VERIFIER);
    try { localStorage.removeItem(LS_STATE); localStorage.removeItem(LS_VERIFIER); } catch (e) { /* noop */ }
    if (!savedState || state !== savedState) {
      setFlag("state_mismatch");
      return { ok: false, msg: "state mismatch" };
    }
    if (!verifier) { setFlag("no_verifier"); return { ok: false, msg: "no verifier" }; }
    try {
      const body = new URLSearchParams();
      body.set("grant_type", "authorization_code");
      body.set("code", code);
      body.set("redirect_uri", getRedirectUri());
      body.set("client_id", getClientId());
      body.set("code_verifier", verifier);
      const d = await tokenFetch(body);
      saveJSON(LS_TOK, {
        access_token: d.access_token,
        refresh_token: d.refresh_token || "",
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        user: null
      });
      // fetch user profile for display name
      try {
        const me = await api("/me");
        const t = loadJSON(LS_TOK, null);
        if (t) { t.user = (me && (me.display_name || me.id)) || null; saveJSON(LS_TOK, t); }
      } catch (e) { /* noop */ }
      setFlag("ok");
      return { ok: true, msg: "connected" };
    } catch (e) {
      setFlag("token_error");
      return { ok: false, msg: String(e.message || e) };
    }
  }

  function setFlag(v) {
    try { localStorage.setItem(LS_FLAG, String(v)); } catch (e) { /* noop */ }
  }
  function consumeFlag() {
    try { const v = localStorage.getItem(LS_FLAG); localStorage.removeItem(LS_FLAG); return v; } catch (e) { return null; }
  }

  function disconnect() {
    try { localStorage.removeItem(LS_TOK); localStorage.removeItem(LS_VERIFIER); localStorage.removeItem(LS_STATE); } catch (e) { /* noop */ }
    return { ok: true, msg: "Spotify disconnected, sir. Dobara connect: Settings → Spotify → CONNECT." };
  }

  /* ── Real API calls ── */
  async function search(q, limit) {
    const d = await api("/search?q=" + encodeURIComponent(q) + "&type=track&limit=" + (limit || 8) + "&market=IN");
    return (d && d.tracks && d.tracks.items) || [];
  }
  async function myPlaylists(limit) {
    const d = await api("/me/playlists?limit=" + (limit || 20));
    return (d && d.items) || [];
  }

  /* ── "play <song> on spotify" — top result Spotify app mein kholo ── */
  async function playQuery(q) {
    if (!isConnected()) return "Spotify connected nahi hai, sir — Settings → Spotify → CONNECT (ya \"connect spotify\" bolo).";
    try {
      const tracks = await search(q, 1);
      if (!tracks.length) return "\"" + q + "\" ka koi result nahi mila, sir. Spelling check karo.";
      const t = tracks[0];
      const url = "https://open.spotify.com/track/" + t.id;
      // popup-blocker safe: tab try karo, link reply mein bhi do (user click kar sakta hai)
      try { const w = window.open(url, "_blank"); if (!w) throw new Error("blocked"); } catch (e) { /* noop — link reply mein hai */ }
      return "Spotify mein \"" + t.name + "\" — " + (t.artists || []).map(a => a.name).join(", ") + " khol raha hoon, sir.\n" + url + "\n(Free plan: Spotify app mein chala jayega. Premium ho toh direct playback bhi ho sakta hai.)";
    } catch (e) {
      return e.message === "SPOTIFY_NOT_CONNECTED"
        ? "Spotify connected nahi hai, sir — Settings → Spotify → CONNECT."
        : "Spotify search fail hua, sir: " + String(e.message || e);
    }
  }

  function status() {
    if (!isConnected()) return "Spotify connected nahi hai, sir. Setup: developer.spotify.com → Create App → Redirect URI mein " + getRedirectUri() + " daalo → Settings → Spotify mein Client ID paste karo → CONNECT.";
    const u = getUser();
    return "Spotify connected" + (u ? " as \\\"" + u + "\\\"" : "") + ", sir. Try: \\\"play <song> on spotify\\\", \\\"spotify search <song>\\\", \\\"my playlists\\\", \\\"connect spotify\\\", \\\"disconnect spotify\\\".";
  }

  return {
    connect, handleCallback, disconnect, status,
    isConnected, getUser, getClientId, setClientId, getRedirectUri,
    search, myPlaylists, playQuery,
    consumeFlag, getAccessToken, api
  };
})();
