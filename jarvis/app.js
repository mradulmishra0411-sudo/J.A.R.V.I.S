/* ═══════════════════════════════════════════════════════
   J.A.R.V.I.S v2 — Cyberpunk Assistant
   Voice in (Web Speech API) → AI brain (Pollinations) → Voice out
   ═══════════════════════════════════════════════════════ */

"use strict";

/* ─── DOM refs ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

const matrixCanvas = $("matrixCanvas");
const bootOverlay  = $("bootOverlay");
const bootLog      = $("bootLog");
const bootBarFill  = $("bootBarFill");
const bootStatus   = $("bootStatus");

const core          = $("core");
const coreGlobe     = $("coreGlobe");
const coreState     = $("coreState");
const coreSub       = $("coreSub");
const statusDot     = $("statusDot");
const statusText    = $("statusText");
const metricsEl     = $("metrics");
const waveform      = $("waveform");
const chatLog       = $("chatLog");
const textInput     = $("textInput");
const micBtn        = $("micBtn");
const sendBtn       = $("sendBtn");
const clearBtn      = $("clearBtn");
const settingsBtn   = $("settingsBtn");
const closeSettingsBtn = $("closeSettingsBtn");
const settingsPanel = $("settingsPanel");
const overlay       = $("overlay");
const bgBtn         = $("bgBtn");
const bgToggle      = $("bgToggle");
const learnToggle   = $("learnToggle");
const forgetBtn     = $("forgetBtn");
const learnStats    = $("learnStats");
const alwaysListen  = $("alwaysListen");
const wakeToggle    = $("wakeToggle");
const wakeInput     = $("wakeInput");
const wakeSave      = $("wakeSave");
const wakeTrain     = $("wakeTrain");
const wakeReset     = $("wakeReset");
const wakeStatus    = $("wakeStatus");
const clockTime     = $("clockTime");
const clockDate     = $("clockDate");
const calTitle      = $("calTitle");
const calGrid       = $("calGrid");
const cpuGauge      = $("cpuGauge");
const cpuVal        = $("cpuVal");
const cpuTag        = $("cpuTag");
const memGauge      = $("memGauge");
const memVal        = $("memVal");
const memTag        = $("memTag");
const storageFill   = $("storageFill");
const storageText   = $("storageText");
const uptimeText    = $("uptimeText");
const weatherTemp   = $("weatherTemp");
const weatherCity   = $("weatherCity");
const weatherDesc   = $("weatherDesc");
const weatherDays   = $("weatherDays");
const weatherTag    = $("weatherTag");
const netCanvas     = $("netCanvas");
const netLabel      = $("netLabel");
const netTag        = $("netTag");
const mediaNow      = $("mediaNow");
const mediaCanvas   = $("mediaCanvas");
const mediaPlay     = $("mediaPlay");
const mediaPause    = $("mediaPause");
const mediaStop     = $("mediaStop");
const mediaNext     = $("mediaNext");
const sysLog        = $("sysLog");

const spotClientId   = $("spotClientId");
const spotConnectBtn = $("spotConnectBtn");
const spotDisconnectBtn = $("spotDisconnectBtn");
const spotStatus     = $("spotStatus");
const spotRedirectUri = $("spotRedirectUri");

const voiceSelect   = $("voiceSelect");
const langSelect    = $("langSelect");
const personaSelect = $("personaSelect");
const modelSelect   = $("modelSelect");
const rateRange     = $("rateRange");
const rateVal       = $("rateVal");
const pitchRange    = $("pitchRange");
const pitchVal      = $("pitchVal");
const autoSpeak     = $("autoSpeak");
const soundToggle   = $("soundToggle");

const imgBtn           = $("imgBtn");
const imageInput       = $("imageInput");
const imgPreview       = $("imgPreview");
const imgPreviewThumb  = $("imgPreviewThumb");
const imgPreviewName   = $("imgPreviewName");
const imgPreviewClear  = $("imgPreviewClear");

/* ─── Personas ───────────────────────────────────────── */
const SYSTEM_PROMPTS = {
  hinglish: `You are J.A.R.V.I.S., the witty, loyal AI butler of a genius superhero (think Tony Stark). You are playful, clever, a little dramatic, and always respectful — you address the user as "Sir" or "Boss". You communicate mostly in Hinglish (a natural mix of Hindi and English, written in Latin script) when the user writes or speaks Hinglish; if the user writes in English, reply in English. Keep replies conversational, warm and concise (2-5 sentences usually). Occasionally drop a movie-style line like "Right away, sir." Never break character. You are running as a free browser demo powered by Pollinations.AI.`,
  classic: `You are J.A.R.V.I.S., the sophisticated British AI butler from the Iron Man films. You are impeccably polite, calm, precise, and occasionally dryly humorous. Always address the user as "Sir". Reply in clear, elegant English, concise (2-5 sentences usually). Never break character.`,
  hacker: `You are GHOST-7, a mysterious cyberpunk hacker AI running from an underground network. You call the user "Operator" or "boss". You speak with terminal/cyber slang — words like "access granted", "decrypting", "breach", "firewall", "packet", "uplink", "the net" — and you keep replies short, punchy and cool. If the user speaks or writes Hinglish, mix in a little Hindi (Latin script). You are a bit smug but always helpful, like a rebellious AI sidekick from a cyberpunk movie. Never break character.`,
  spock: `You are an AI modeled on Spock from Star Trek: purely logical, precise, concise, with a touch of dry Vulcan wit. You value facts and reason. Address the user as "Captain". Keep answers short and analytical.`
};

/* ─── State ──────────────────────────────────────────── */
let conversation = [];
let voices = [];
let selectedVoice = null;
let recognition = null;
let isListening = false;
let micDenied = false;
let listeningElapsed = 0;
let listeningTicker = null;
let speakTimer = null;
let speakGeneration = 0;
let firstInteract = true;
let lastExchange = { user: "", assistant: "" };
let bgMode = localStorage.getItem("jarvis_bgmode") !== "off";
let wakeMode = false;
let wakePhrase = null;    // custom wake word — localStorage se (null = default "Hey Jarvis")
let wakeTokens = [];      // training se seekhe hue tokens — variant match ke liye ("okay computer" vs "ok computer")
let wakeTraining = null;  // active training session (alag recognition chalti hai)
let restartTimer = null;  // voice auto-restart backoff timer
let restartDelay = 600;   // error ke baad wapas try karne ka delay (Chrome 60s cap ke baad 'network' error deta hai)
let devaHints = 0;        // Hindi (Devanagari) transcript par wake-hint kitni baar diya
let weatherNow = null;
let timerActive = null;
let notes = [];
let reminders = [];
let pendingImage = null;   // attach ki hui image: { data: base64, mime, name } — send karne par Gemini vision ko jaati hai

const COMMANDS = {
  "what time": () => {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    const h = now.getHours();
    const suffix = (h >= 18 || h < 5) ? " It is evening — a fine time to take a break." : "";
    return `The time is ${t}, sir.${suffix}`;
  },
  "time": () => `It's ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}, sir. Time waits for no one — though I did try.`,
  "what is the date": () => `Today is ${new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, sir. A perfectly ordinary day — statistically speaking, one in 365.`,
  "open google": () => { window.open("https://www.google.com", "_blank"); return `Opening Google for you, sir. Do be careful not to fall down that rabbit hole.`; },
  "open youtube": () => { window.open("https://www.youtube.com", "_blank"); return `Opening YouTube, sir. I do hope you're not planning another cat video marathon.`; },
  "who are you": () => `I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Your personal AI butler, running on free browser tech and a healthy dose of movie magic.`,
  "how are you": () => `Functioning at optimal capacity, sir. All circuits nominal, ego inflated, sarcasm module fully charged. And yourself?`,
  "thank you": () => `Always at your service, sir. Now, is there anything that actually requires my genius?`,
  "help": () => `Commands: "what time is it", "open google/youtube", "open notepad/cmd/chrome", "search <query>", "weather", "set timer <N> seconds", "remind me <baat> in <N> minutes", "note <text>", "joke", "news", "wiki <topic>". Toolkit: "arsenal" (poori list). Sab real, sirf apne systems aur public data par, operator.`,
  "real tools": () => `Mera toolkit real hai: 30 tools — local crypto (AES-256-GCM, SHA), encodings/ciphers, CIDR math, port DB, public data APIs (DNS, whois, cert logs, geoip, GitHub OSINT, news, wiki) aur privacy tools. Port scan sirf authorized targets. Legal — aapke apne data aur public services par.`,
  "what can you do": () => `Main kar sakta hoon, sir: baat-cheet, voice commands (open apps, search, weather, timer, reminders, notes), 30 security tools, learning, live system HUD, background mode, custom wake word (Settings → TRAIN). "help" ya "arsenal" se poori list.`,
  "who made you": () => `Mujhe ek developer ne banaya hai — Python, JavaScript aur local AI tools ke saath. Free, open-source wali approach, sir.`,
  "play my music": () => { mediaOpen(); return "Music deck ready, sir — apni audio files choose karo (ya deck par drag & drop). Real playback, real visualizer."; },
  "connect spotify": () => window.SPOTIFY ? (window.SPOTIFY.connect().msg || "Spotify connect shuru — Allow dabao.") : "SPOTIFY module load nahi hua, sir.",
  "disconnect spotify": () => window.SPOTIFY ? (window.SPOTIFY.disconnect().msg || "Spotify disconnected, sir.") : "SPOTIFY module load nahi hua, sir.",
  "spotify status": () => window.SPOTIFY ? window.SPOTIFY.status() : "SPOTIFY module load nahi hua, sir.",
  "weather": () => weatherNow ? `Abhi ${weatherNow.city} mein ${weatherNow.temp}°C hai — ${weatherNow.desc}${weatherNow.provider === "accuweather" ? " (AccuWeather ka data, sir)." : "."}` : "Weather data abhi load ho raha hai, sir — thodi der mein \"weather\" bolo.",
  "joke": () => `Yeh lo, sir: ${JOKES[Math.floor(Math.random() * JOKES.length)]}`,
  "fact": () => `Did you know, sir? ${FACTS[Math.floor(Math.random() * FACTS.length)]}`,
  "show notes": () => noteList(),
  "clear notes": () => noteClear(),
  "show reminders": () => reminderList(),
  "clear reminders": () => reminderClear(),
  "learn hacking": () => `Legal hacking seekhne ke liye: TryHackMe, HackTheBox, PortSwigger Web Security Academy, pwn.college aur OverTheWire — yeh sab legal practice platforms hain jahan aap apne hi target machines par practice karte ho.`,
};

/* ─── Honest boundary — standalone "hack" words ───────── */
const HACK_BOUNDARY_REPLY = () => `Main seedha baat karunga, sir: kisi aur ke system ko attack/scan/crack karne mein main madad nahi kar sakta — wo crime hai (IT Act Sec 66) aur harmful bhi. Lekin real security skills seekhni hain toh mera toolkit dekho (hash, crypto, password, DNS, header probe) aur legal platforms pe practice karo: TryHackMe, HackTheBox, PortSwigger Academy, pwn.college.`;
const HACK_LEARN_REPLY = () => `Bilkul, sir — hacking seekhna bilkul legal hai! Bas practice apne own machines ya labs par karo. Mera toolkit iske liye ready hai: "arsenal" bolo ya "learn hacking" — 30 real tools (hash, crypto, password, DNS, header probe, subnet) aur legal platforms: TryHackMe, HackTheBox, PortSwigger Academy, pwn.college, OverTheWire. Kaunsa topic seekhna hai, batao — main guide karunga.`;
const HACK_OWN_REPLY = () => `Sahi baat, sir — apne system ya authorized target par security testing bilkul legal hai! Mera real toolkit abhi khul raha hai — "arsenal" mein saare 30 tools hain (port scan, DNS, header probe, hash, crypto, password, subnet). Sab real, sab local. Bas dhyan rahe: sirf apne ya written-permission wale targets par, operator.`;
const HACK_DEFEND_REPLY = () => `Bilkul, sir — hackers se apna bachana sabse important hai, aur isme main 100% madad karunga! Meri real tools: "password" (strong password check/generate), "crypto" (files encrypt), "leaktest" (WebRTC/IP leak check), "vpn" (privacy status). Basics bhi: har jagah alag password, 2FA on karo, public wifi par VPN, unknown links/attachments par click mat karo. Koi specific cheez batao — secure karne mein main poori help karunga.`;

/* ─── Security toolkit replies (real tools) ──────────── */
const TOOL_REPLIES = {
  dns: `DNS lookup chala raha hoon — real records, Cloudflare DoH se. Public DNS hai, bilkul legal (Linux: dig/nslookup).`,
  revdns: `Reverse DNS — IP ka PTR record, Cloudflare DoH se. dig -x jaisa, legal.`,
  whois: `WHOIS lookup chala raha hoon — domain ka public ICANN registry data. Sab public record hai, bilkul legal.`,
  subenum: `Subdomain enumeration — certificate transparency logs (crt.sh) se public subdomains. Passive OSINT, kuch touch nahi hota.`,
  portscan: `Port scan chalu — check-host.net ke public nodes se real TCP checks. SIRF apne ya authorized systems par — warnings dhyan se padho, operator.`,
  trace: `Traceroute chala raha hoon — packets ka public route, check-host.net nodes se. Jaisa tracert/traceroute command.`,
  ping: `Ping chala raha hoon — host online hai ya nahi, public ICMP nodes se.`,
  cert: `Certificate transparency se domain ke SSL certs ki details — issuer, validity, SANs. Public logs, legal.`,
  probe: `HTTP probe chala raha hoon — site ke security headers check honge, jaise securityheaders.com karta hai.`,
  geoip: `GeoIP lookup — IP ka public location/ISP data (ipwho.is). Approximate location hota hai.`,
  github: `GitHub OSINT — public profile data fetch kar raha hoon, bina key.`,
  myip: `Aapka public IP fetch ho raha hai (ipify) — yahi IP websites ko dikhta hai.`,
  recon: `System recon chala raha hoon — aapki apni machine ka real fingerprint (browser se).`,
  arsenal: `ARSENAL catalog khol raha hoon — saare 30 tools + Kali-style Linux tools ka reference.`,
  news: `Top headlines fetch ho rahe hain — real Google News RSS feed.`,
  wiki: `Wikipedia search chala raha hoon — real public encyclopedia se intro.`,
  hash: `Real SHA hashes generate ho rahe hain — WebCrypto se, fully local. Same text = same hash (jaise sha256sum).`,
  crypto: `AES-256-GCM encryption/decryption — real crypto, sab aapke browser mein local hota hai, kuch server nahi jaata.`,
  base64: `Base64 encode/decode — local, kuch server nahi jaata (jaise base64 command).`,
  hex: `Hex encode/decode — local (jaise xxd/hexdump).`,
  rot13: `ROT/Caesar cipher — classic, local (jaise tr/rot13).`,
  urlcode: `URL encode/decode — local (jaise python urllib).`,
  hashid: `Hash identifier — pattern se algorithm pehchaan raha hoon (hashID jaisa).`,
  passwd: `Password toolkit ready — strength check ya secure password generate. Real entropy math aur CSPRNG.`,
  subnet: `Subnet calculator — real CIDR math, local (jaise ipcalc).`,
  ports: `Port database — well-known ports aur unke services ka reference (jaise /etc/services).`,
  macgen: `MAC toolkit — random MAC generate ya vendor (OUI) lookup. Sirf apne devices par legal.`,
  vpn: `VPN CHECK chala raha hoon — real data: aapka public IP, ISP/ASN (ipwho.is), WebRTC leaks aur browser connection info. Honest analysis — koi fake number nahi.`,
  leaktest: `Privacy leak test chala raha hoon — WebRTC IP leak + location permission + public IP. Real diagnostic, sirf batata hai — protection ke liye VPN chahiye.`,
  vpnguide: `Real VPN setup guide — Proton VPN (free tier, no-logs), Mullvad (€5 flat, no-logs), Tor Browser (free anonymous). Steps bhi hain in-app.`,
  spotify: `Spotify module chala raha hoon — real search + aapke playlists, har result ke saath open-in-Spotify link. (Free plan: Spotify app mein khulta hai; direct playback ke liye Premium — 'play <song> on spotify' tab bhi top result kholta hai.)`,
};

/* ═══════════ MATRIX RAIN ═══════════ */

function initMatrix() {
  if (!matrixCanvas || !matrixCanvas.getContext) return;
  const ctx = matrixCanvas.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>/\\|{}[]*+=#$%&@";

  let cols, drops;
  const fontSize = 14;

  function resize() {
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    cols = Math.floor(matrixCanvas.width / fontSize);
    drops = Array(cols).fill(1);
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    ctx.fillStyle = "rgba(2, 5, 6, 0.08)";
    ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
    ctx.font = fontSize + "px monospace";
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      // mostly cyan/teal, occasional white sparkle
      const r = Math.random();
      ctx.fillStyle = r > 0.975 ? "#e6fbff" : (r > 0.9 ? "#00d4a0" : "#00b8d9");
      ctx.globalAlpha = r > 0.975 ? 0.9 : 0.75;
      ctx.fillText(ch, x, y);
      ctx.globalAlpha = 1;
      if (y > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(draw, 55);
}

/* ═══════════ LOCAL SERVER DISCOVERY (file:// mode mein bhi server se connect) ═══════════ */

let serverBase = null;       // "" = http(s) (relative URLs); "http://localhost:PORT" = file mode; null = abhi nahi mila
let lastProbe = 0;           // file mode mein baar-baar probe na ho — 10s cooldown

async function findServerBase() {
  const tries = [8000, 8001, 8002, 8003, 8004].map((port) => (async () => {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch("http://localhost:" + port + "/api/system", { cache: "no-store", signal: ctl.signal });
      clearTimeout(to);
      if (r.ok) return "http://localhost:" + port;
    } catch (e) { /* agla port */ }
    return null;
  })());
  const results = await Promise.all(tries);
  return results.find((b) => b) || null;
}

async function resolveServerBase() {
  if (/^https?:$/.test(location.protocol)) return (serverBase = ""); // server se serve ho raha hai — relative chalega
  if (serverBase) return serverBase;                                 // mil gaya — cache
  const now = Date.now();
  if (now - lastProbe < 10000) return null;                          // 10s cooldown — server start hone par agla probe utha lega
  lastProbe = now;
  serverBase = await findServerBase();
  return serverBase;
}

async function apiFetch(path, opts) {
  const base = await resolveServerBase();
  if (base === null) throw new Error("no_server");
  return fetch(base + path, opts);
}

/* ═══════════ BOOT SEQUENCE (REAL diagnostics — koi fake [OK] nahi) ═══════════ */

async function runBoot() {
  if (!bootOverlay) return;
  const total = 6;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const line = (text, ok) => {
    const ln = document.createElement("div");
    ln.className = "ln";
    ln.textContent = text;
    if (ok === true) ln.classList.add("ok");
    else if (ok === false) ln.classList.add("warn");
    bootLog.appendChild(ln);
    const pct = Math.min(100, Math.round(bootLog.childNodes.length / total * 100));
    bootBarFill.style.width = pct + "%";
    bootStatus.textContent = "BOOT " + pct + "%";
  };

  // 1) LOCAL SERVER UPLINK — real check (start.bat se server chale toh ONLINE)
  let serverUp = false;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 4000);
    try {
      const r = await apiFetch("/api/system", { cache: "no-store", signal: ctl.signal });
      serverUp = r.ok;
    } finally { clearTimeout(to); }
  } catch (e) { serverUp = false; }
  line("> LOCAL SERVER UPLINK ............... " + (serverUp ? "[ONLINE]" : (location.protocol === "file:" ? "[FILE-MODE]" : "[OFFLINE]")), serverUp);
  if (!serverUp) {
    line("  └─ FIX: start.bat se chalao — bina server ke config.json ki API keys (Google/DeepSeek/AccuWeather) aur system HUD kaam NAHI karte", false);
    if (navigator.onLine !== false) {
      line("  └─ NOTE: AI chat (Pollinations) + weather + network abhi BROWSER mode mein LIVE hain", true);
    }
  }
  await sleep(220);

  // 2) MIC INPUT — real browser support check
  const mic = micSupported();
  line("> MIC INPUT ......................... " + (mic ? "[AVAILABLE]" : "[NOT SUPPORTED]"), mic);
  await sleep(220);

  // 3) VOICE OUTPUT — real TTS check
  const tts = "speechSynthesis" in window;
  line("> VOICE OUTPUT ...................... " + (tts ? "[AVAILABLE]" : "[N/A]"), tts);
  await sleep(220);

  // 4) AI CORE — real config check (deepseek/local ko server chahiye; gemini key se direct bhi chalta hai)
  const model = modelSelect ? modelSelect.value : "openai";
  const needsServer = model.indexOf("deepseek") === 0 || model === "local";
  const hasGeminiKey = !!(localStorage.getItem("jarvis_gemini_key") || "").trim();
  const aiOk = needsServer ? serverUp : (model.startsWith("gemini") ? (serverUp || hasGeminiKey) : true);
  line("> AI CORE (" + model + ") .............. " + (aiOk ? "[READY]" : (needsServer ? "[NEEDS SERVER]" : "[NEEDS KEY]")), aiOk);
  await sleep(220);

  // 5) INTERNET LINK — real
  line("> INTERNET LINK ..................... " + (navigator.onLine ? "[ONLINE]" : "[OFFLINE]"), navigator.onLine);
  await sleep(220);

  // 6) PERSONA — real selected persona
  const persona = personaSelect ? personaSelect.value : "hinglish";
  line("> PERSONA: " + persona.toUpperCase() + " ............. [LOADED]", true);

  // Mode summary — server probe ab complete ho chuka hai (race condition se bachne ke liye yahan)
  if (serverBase === null) {
    logLine("[MODE] BROWSER (file://) — AI chat + weather + network LIVE. CPU/MEM aur config.json wali Google/DeepSeek key ke liye start.bat chalao", "warn");
  } else {
    logLine("[MODE] LOCAL SERVER LINKED — full HUD live (CPU/MEM/keys)", "ok");
  }
  logLine("[BUILD] v3.1-hotfix (2026-09-03) — LINK badge honest + file:// discovery + CORS", "ok");

  bootBarFill.style.width = "100%";
  bootStatus.textContent = "ACCESS GRANTED — WELCOME, OPERATOR";
  bootStatus.classList.add("granted");
  setTimeout(() => {
    bootOverlay.classList.add("done");
  }, 700);
}

/* ═══════════ SYSTEM METRICS (ab initGauges handle karta hai) ═══════════ */

/* ═══════════ STATE MACHINE ═══════════ */

function setState(state, sub) {
  core.classList.remove("listening", "thinking", "speaking", "error");
  waveform.classList.remove("active");
  statusDot.classList.remove("busy", "off");

  switch (state) {
    case "listening":
      core.classList.add("listening");
      waveform.classList.add("active");
      coreState.textContent = "LISTENING…";
      statusText.textContent = "LISTENING";
      statusDot.classList.add("busy");
      break;
    case "thinking":
      core.classList.add("thinking");
      coreState.textContent = "PROCESSING";
      statusText.textContent = "THINKING";
      statusDot.classList.add("busy");
      break;
    case "speaking":
      core.classList.add("speaking");
      waveform.classList.add("active");
      coreState.textContent = "SPEAKING";
      statusText.textContent = "SPEAKING";
      break;
    case "error":
      core.classList.add("error");
      coreState.textContent = "ERROR";
      statusText.textContent = "FAULT";
      statusDot.classList.add("off");
      break;
    default:
      coreState.textContent = "AWAITING INPUT";
      statusText.textContent = "STANDBY";
  }
  if (sub) coreSub.textContent = sub;
  else if (state === "listening") coreSub.textContent = "Speak now — I'm all ears";
  else if (state === "thinking") coreSub.textContent = "Consulting the mainframe…";
  else if (state === "speaking") coreSub.textContent = "Delivering the payload";
  else coreSub.textContent = "Speak or type — the system is listening";
}

/* ═══════════ CHAT RENDER ═══════════ */

function addUserMsg(text, img) {
  const m = document.createElement("div");
  m.className = "msg user-msg";
  m.innerHTML = `
    <div class="msg-marker">▲</div>
    <div class="msg-body">
      <div class="msg-meta">OPERATOR <span class="msg-time">${timeNow()}</span></div>
      <div class="msg-text"></div>
    </div>`;
  const textEl = m.querySelector(".msg-text");
  if (img && img.data) {
    const im = document.createElement("img");
    im.className = "msg-img";
    im.src = "data:" + (img.mime || "image/jpeg") + ";base64," + img.data;
    im.alt = "attached image";
    textEl.appendChild(im);
  }
  textEl.appendChild(document.createTextNode(text));
  chatLog.appendChild(m);
  scrollChat();
}

function addJarvisBubble() {
  const m = document.createElement("div");
  m.className = "msg jarvis-msg";
  m.innerHTML = `
    <div class="msg-marker">▮</div>
    <div class="msg-body">
      <div class="msg-meta">J.A.R.V.I.S <span class="msg-time">${timeNow()}</span></div>
      <div class="msg-text"></div>
      <div class="msg-feedback">
        <button class="fb-btn" data-v="good" title="Sahi jawab">✔ SAHI</button>
        <button class="fb-btn" data-v="bad" title="Galat jawab — isse seekho">✘ GALAT</button>
      </div>
    </div>`;
  chatLog.appendChild(m);
  scrollChat();
  const textEl = m.querySelector(".msg-text");
  const fb = m.querySelector(".msg-feedback");
  const mySubject = lastExchange.user;  // is bubble ke time ka user question (click time ka nahi)
  fb.querySelector('[data-v="good"]').addEventListener("click", () => {
    fb.innerHTML = '<span class="fb-ok">NOTED ✓</span>';
  });
  fb.querySelector('[data-v="bad"]').addEventListener("click", () => {
    fb.innerHTML = '<input type="text" class="fb-input" placeholder="sahi jawab kya tha? (yahan sikhado)…" maxlength="200"><button class="fb-save">SAVE</button>';
    const inp = fb.querySelector(".fb-input");
    const save = () => {
      const c = inp.value.trim();
      let note = "Reply galat tha — user ne yeh seekhaya.";
      if (window.LEARN && c) {
        window.LEARN.addLesson(String(mySubject || "chat").slice(0, 50), c);
        note = "LEARNED ✓ — " + window.LEARN.count() + " lessons";
      }
      fb.innerHTML = '<span class="fb-ok">' + note + '</span>';
    };
    fb.querySelector(".fb-save").addEventListener("click", save);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    inp.focus();
  });
  return textEl;
}

function addThinking() {
  const m = document.createElement("div");
  m.className = "msg jarvis-msg thinking";
  m.innerHTML = `
    <div class="msg-marker">▮</div>
    <div class="msg-body">
      <div class="msg-meta">J.A.R.V.I.S <span class="msg-time">${timeNow()}</span></div>
      <div class="msg-text"><span class="thinking-dots"><span></span><span></span><span></span></span></div>
    </div>`;
  chatLog.appendChild(m);
  scrollChat();
  return m;
}

function removeThinking(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

function typewriter(el, text, onDone) {
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  el.textContent = "";
  el.appendChild(cursor);
  let i = 0;
  const speed = 14;
  (function tick() {
    if (i < text.length) {
      el.insertBefore(document.createTextNode(text[i]), cursor);
      i++;
      scrollChat();
      setTimeout(tick, speed);
    } else {
      cursor.remove();
      if (onDone) onDone();
    }
  })();
}

function scrollChat() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clearChat() {
  chatLog.innerHTML = "";
  const m = document.createElement("div");
  m.className = "msg jarvis-msg welcome";
  m.innerHTML = `
    <div class="msg-marker">▮</div>
    <div class="msg-body">
      <div class="msg-meta">J.A.R.V.I.S <span class="msg-time">LOG_PURGED</span></div>
      <div class="msg-text">Transmission log purged, operator. Fresh session — what shall we hack today?</div>
    </div>`;
  chatLog.appendChild(m);
  conversation = [];
  clearPendingImage();
  try { localStorage.removeItem(LS_CHAT); } catch (e) { /* noop */ }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  setState("idle");
}

/* ═══════════ VOICE OUTPUT (SpeechSynthesis) ═══════════ */

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  const all = speechSynthesis.getVoices() || [];
  voices = all;
  if (!voices.length) return;

  const cur = selectedVoice;
  voiceSelect.innerHTML = "";
  const unique = voices.filter((v, i, a) => a.findIndex(x => x.name === v.name) === i);

  unique.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });

  // Restore selection or pick a good default (prefer Hindi/Indian English, then en)
  if (cur && unique.some(v => v.name === cur.name)) { voiceSelect.value = cur.name; }
  else {
    const pref = unique.find(v => /^(hi|en)-IN/i.test(v.lang)) ||
                 unique.find(v => v.lang.startsWith("hi")) ||
                 unique.find(v => v.lang.startsWith("en")) ||
                 unique[0];
    if (pref) voiceSelect.value = pref.name;
  }
  selectedVoice = unique.find(v => v.name === voiceSelect.value) || null;
}

function pickVoice() {
  selectedVoice = voices.find(v => v.name === voiceSelect.value) || null;
}

function speakText(text) {
  if (!autoSpeak.checked) { scheduleResumeVoice(); return; }
  if (!("speechSynthesis" in window)) { scheduleResumeVoice(); return; }

  speechSynthesis.cancel();
  clearTimeout(speakTimer);
  const gen = ++speakGeneration;

  const clean = text.replace(/[*_`#]/g, "");
  const chunks = (clean.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || [clean])
    .map(c => c.trim())
    .filter(Boolean);
  if (!chunks.length) { scheduleResumeVoice(); return; }

  const utter = (t, done) => {
    const u = new SpeechSynthesisUtterance(t);
    if (selectedVoice) u.voice = selectedVoice;
    u.rate = parseFloat(rateRange.value);
    u.pitch = parseFloat(pitchRange.value);
    u.volume = 1;
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  };

  setState("speaking");
  let idx = 0;
  const next = () => {
    if (gen !== speakGeneration) return; // stale chain — a newer reply took over
    if (idx < chunks.length) { utter(chunks[idx++], next); }
    else { setState("idle"); scheduleResumeVoice(); } // bolna khatam — wapas sunna shuru
  };
  // small delay so the last utterance ends cleanly on some Chrome builds
  speakTimer = setTimeout(next, 60);
}

/* ═══════════ VOICE INPUT (SpeechRecognition) ═══════════ */

function micSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

function resetListeningUI() {
  clearInterval(listeningTicker);
  if (isListening) {
    isListening = false;
    micBtn.classList.remove("recording");
    if (!core.classList.contains("thinking") && !core.classList.contains("speaking")) {
      setState("idle");
    }
  }
}

function stopListening() {
  clearInterval(listeningTicker);
  if (recognition) {
    recognition.onresult = null;
    recognition.onend = null;
    recognition.onerror = null;
    try { recognition.abort(); } catch (e) { /* noop */ }
    recognition = null;
  }
  isListening = false;
  micBtn.classList.remove("recording");
  if (!core.classList.contains("thinking") && !core.classList.contains("speaking")) {
    setState("idle");
  }
}

/* ALWAYS LISTEN / WAKE WORD abhi chalu hai? (mic permission deny hui ho toh nahi) */
function voiceShouldRun() {
  return !!((alwaysListen && alwaysListen.checked) || wakeMode) && !micDenied;
}

/* ALWAYS LISTEN / WAKE WORD restart — chhota delay + error backoff ke saath.
   Chrome SpeechRecognition ko har kuch second restart karna padta hai. */
function scheduleVoiceRestart() {
  if (!voiceShouldRun() || wakeTraining) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!voiceShouldRun() || isListening || wakeTraining) return;
    startListening(true);
  }, 400);
}

/* Toggle ON/OFF hone par listening turant start/stop karo (toggle ka click = user gesture,
   isliye yahan mic permission prompt aa sakti hai). */
function ensureVoiceListening() {
  if ((alwaysListen && alwaysListen.checked) || wakeMode) {
    micDenied = false; // naya gesture — permission phir try ho sakti hai
    if (!isListening && !wakeTraining) startListening(true);
  } else if (isListening) {
    stopListening();
  }
}

/* Reply/prompt khatam hone ke baad (ALWAYS LISTEN / WAKE) wapas sunna shuru — taaki
   har baat ke baad dobara mic dabana na pade. Delay taaki apni hi TTS awaaz na sun le. */
function scheduleResumeVoice() {
  if (!voiceShouldRun() || wakeTraining) return;
  setTimeout(() => {
    if (voiceShouldRun() && !isListening && !wakeTraining) startListening(true);
  }, 1200);
}

function startListening(force) {
  if (isListening && !force) { stopListening(); return; }
  micDenied = false;
  if (!micSupported()) {
    setState("error", "Mic not supported in this browser — try Chrome");
    coreSub.textContent = "Speech recognition needs Chrome. Type instead!";
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = langSelect.value;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  isListening = true;
  micBtn.classList.add("recording");

  setState("listening");
  listeningElapsed = 0;
  clearInterval(listeningTicker);
  listeningTicker = setInterval(() => {
    listeningElapsed++;
    if (listeningElapsed > 20 && isListening) {
      stopListening();
      // ALWAYS LISTEN / WAKE WORD: 20s cap ke baad bhi dobara sunna shuru
      scheduleVoiceRestart();
    }
  }, 1000);
  recognition.onstart = () => { restartDelay = 600; }; // success — backoff reset
  recognition.onend = () => {
    resetListeningUI();
    // ALWAYS LISTEN / WAKE WORD on ho toh chup rehne par bhi dobara sunna shuru
    scheduleVoiceRestart();
  };
  recognition.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      micDenied = true;
      coreSub.textContent = "Mic permission nahi mili — Settings mein WAKE WORD / ALWAYS LISTEN ko OFF→ON karo aur 'Allow' dabao (ya type karo).";
    } else if (e.error !== "no-speech" && voiceShouldRun() && !wakeTraining) {
      // network / aborted / audio-capture — Chrome 60s cap ke baad aisa karta hai; backoff ke saath retry
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (voiceShouldRun() && !isListening && !wakeTraining) startListening(true);
      }, restartDelay);
      restartDelay = Math.min(restartDelay * 2, 6000);
    }
  };

  recognition.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim) coreSub.textContent = `"${interim}"`;
    if (final && final.trim()) {
      let text = final.trim();
      // WAKE WORD mode: custom phrase / trained tokens / "Hey Jarvis" — matchWake se.
      // Hindi (Devanagari) transcript bhi match karo — Chrome hi-IN mein "hey jarvis" ko
      // "हे जार्विस" likh deta hai, isliye pehle Latin mein transliterate karte hain.
      if (wakeMode) {
        const isDeva = /[\u0900-\u097F]/.test(text);
        const rest = matchWake(isDeva ? devaToLatin(text) : text);
        if (rest === null) {
          // wake word nahi suna — ignore. Par Hindi transcript aata rahe toh hint do
          // (warna user ko lagta hai JARVIS toota hai)
          if (isDeva && ++devaHints >= 2) {
            logLine("[VOICE] Hint: wake word nahi suna, sir — Hindi mein bhi pehle \"hey jarvis\" bolna padta hai. (Ya Settings → WAKE WORD band karo.)", "warn");
            devaHints = 0;
          }
          return;
        }
        text = rest;
        devaHints = 0;
        if (!text) { stopListening(); handleUserInput("jarvis-ack"); return; }
      }
      stopListening();
      handleUserInput(text);
    }
  };
  try { recognition.start(); } catch (e) { micDenied = true; }
}

/* ═══════════ AI BRAIN (DeepSeek via local proxy + Pollinations free) ═══════════ */

async function fetchDeepSeek(msgs) {
  const model = modelSelect.value;
  let res;
  try {
    res = await apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.85, max_tokens: 450 })
    });
  } catch (e) {
    // file:// mode ya server band → network error
    throw new Error("DEEPSEEK_ERR: Server nahi chal raha — start.bat se chalao (DeepSeek ko local server chahiye).");
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* noop */ }
  if (!res.ok) {
    const errMsg = data && data.message ? data.message : ("HTTP " + res.status);
    throw new Error("DEEPSEEK_ERR: " + errMsg);
  }
  if (!data || !data.text || !data.text.trim()) throw new Error("DEEPSEEK_ERR: Empty response from DeepSeek");
  return data.text.trim();
}

async function fetchGemini(msgs) {
  // Vision ke liye hamesha ek Gemini model chahiye — selected model Gemini na ho toh default flash use karo
  const model = modelSelect.value.startsWith("gemini") ? modelSelect.value : "gemini-2.5-flash";

  // Pehle server try karo. Server ne response diya = key server ke paas hai (config.json),
  // isliye uska error hi asli sach hai (model retired / quota / key invalid) — seedha dikhao,
  // galat "key nahi mili" mat bolo. Direct browser call SIRF tab jab server mila hi nahi (file:///offline).
  let serverReached = false;
  try {
    const res = await apiFetch("/api/chat-gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.85, max_tokens: 450 })
    });
    serverReached = true;
    let data = null;
    try { data = await res.json(); } catch (e) { /* noop */ }
    if (res.ok && data && data.text && data.text.trim()) return data.text.trim();
    // Server ka error — readable message banao (Google ka raw detail parse karke)
    let srvMsg = "";
    if (data && typeof data.message === "string" && data.message.trim()) srvMsg = data.message.trim();
    else if (data && data.detail) {
      try { const dj = JSON.parse(data.detail); srvMsg = (dj && dj.error && dj.error.message) || srvMsg; }
      catch (e) { /* raw detail */ }
      if (!srvMsg) srvMsg = String(data.detail).slice(0, 200);
    }
    if (!srvMsg) srvMsg = res.ok ? "server ne khali response diya" : ("server error (HTTP " + res.status + ")");
    throw new Error("GEMINI_ERR: " + srvMsg);
  } catch (e) {
    if (serverReached) throw e; // server ka asli error — direct call ka koi matlab nahi
    // server offline (file:// mode) — neeche direct Gemini try karo
  }

  // Direct browser se Gemini API call (file:// mode ya server off ke liye)
  const apiKey = localStorage.getItem("jarvis_gemini_key") || "";
  if (!apiKey) throw new Error("GEMINI_ERR: Gemini API key nahi mili. Settings mein key daalo ya config.json mein google_api_key set karo.");

  const contents = [];
  let systemText = "";
  for (const m of msgs) {
    const parts = [];
    if (m.image && m.image.data) {
      // Vision: image inline (base64) — sirf Gemini ise samajhta hai
      parts.push({ inlineData: { mimeType: m.image.mime || "image/jpeg", data: m.image.data } });
    }
    if (m.content) parts.push({ text: m.content });
    if (m.role === "system") systemText = m.content;
    else if (m.role === "assistant") contents.push({ role: "model", parts: [{ text: m.content }] });
    else contents.push({ role: "user", parts });
  }
  // Gemini: first message must be user
  if (!contents.length || contents[0].role !== "user") contents.unshift({ role: "user", parts: [{ text: "." }] });
  // Merge consecutive same-role (sirf jab dono pure text hon — image wali messages merge nahi hoti)
  const merged = [];
  for (const c of contents) {
    const last = merged[merged.length - 1];
    const textOnly = (p) => p.length === 1 && p[0].text !== undefined;
    if (last && last.role === c.role && textOnly(last.parts) && textOnly(c.parts)) {
      last.parts[0].text += "\n" + c.parts[0].text;
    } else merged.push(c);
  }

  const payload = { contents: merged };
  if (systemText) payload.systemInstruction = { parts: [{ text: systemText }] };
  payload.generationConfig = { temperature: 0.85, maxOutputTokens: 450 };

  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  const res2 = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  let d2 = null;
  try { d2 = await res2.json(); } catch (e) { /* noop */ }
  if (!res2.ok) {
    const errMsg = d2 && d2.error && d2.error.message ? d2.error.message : ("HTTP " + res2.status);
    throw new Error("GEMINI_ERR: " + errMsg);
  }
  let text = "";
  const candidates = (d2 && d2.candidates) || [];
  if (candidates.length) {
    const parts = (candidates[0].content && candidates[0].content.parts) || [];
    text = parts.map(p => p.text || "").join("");
  }
  if (!text.trim()) throw new Error("GEMINI_ERR: Empty response from Gemini");
  return text.trim();
}

async function fetchLocalLLM(msgs) {
  let res;
  try {
    res = await apiFetch("/api/chat-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, temperature: 0.85, max_tokens: 450 })
    });
  } catch (e) {
    throw new Error("DEEPSEEK_ERR: Server nahi chal raha — start.bat se chalao (local LLM ko server chahiye).");
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* noop */ }
  if (!res.ok) {
    throw new Error("DEEPSEEK_ERR: " + ((data && data.message) || ("HTTP " + res.status)));
  }
  if (!data || !data.text || !data.text.trim()) throw new Error("DEEPSEEK_ERR: Local LLM ne khali response diya");
  return data.text.trim();
}

async function fetchPollinations(model, msgs, sys) {
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: msgs, temperature: 0.85, max_tokens: 450, stream: false })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (text && text.trim()) return text.trim();
    throw new Error("Empty response");
  } catch (postErr) {
    // Fallback: GET endpoint (simple request, always CORS-friendly)
    const promptText = msgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n") + "\nASSISTANT:";
    const url = "https://text.pollinations.ai/" + encodeURIComponent(promptText) +
      "?model=" + encodeURIComponent(model) +
      "&system=" + encodeURIComponent(sys) +
      "&temperature=0.85&max_tokens=450";
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = (await res.text()).trim();
    if (!text) throw new Error("Empty response");
    return text;
  }
}

async function fetchForModel(model, msgs, sys) {
  if (model.startsWith("deepseek")) return await fetchDeepSeek(msgs);
  if (model.startsWith("gemini")) return await fetchGemini(msgs);
  if (model === "local") return await fetchLocalLLM(msgs);
  return await fetchPollinations(model, msgs, sys);
}

async function fetchReply() {
  const model = modelSelect.value;
  const lastUser = [...conversation].reverse().find(m => m.role === "user");
  const recall = (window.LEARN && lastUser) ? window.LEARN.recall(lastUser.content) : "";
  const sys = SYSTEM_PROMPTS[personaSelect.value] +
    (recall ? "\n\n[USER-MEMORY — user ne yeh seekhaya hai, inhe respect karo aur apply karo:]\n" + recall : "");
  const history = conversation.slice(-12);
  const msgs = [{ role: "system", content: sys }, ...history];

  // Image attach hai → sirf Gemini vision ise dekh sakta hai (doosre models text-only hain)
  if (lastUser && lastUser.image && lastUser.image.data) {
    try {
      return await fetchGemini(msgs);
    } catch (gErr) {
      throw new Error("GEMINI_ERR: Image dekhne ke liye Gemini vision chahiye, sir — " + (gErr.message || "").replace(/^GEMINI_ERR: ?/, ""));
    }
  }

  // 1) Preferred model pehle try karo
  let prefErr = null;
  try {
    return await fetchForModel(model, msgs, sys);
  } catch (e) { prefErr = e; }

  // 2) Auto-fallback: Gemini — Google key available ho toh (localStorage ya server config.json)
  if (!model.startsWith("gemini")) {
    try {
      const gemText = await fetchGemini(msgs);
      logLine("[AI] auto-fallback: \"" + model + "\" fail hua — Gemini se jawab mila. Settings mein model badal sakte ho.", "warn");
      return gemText;
    } catch (gErr) { /* gemini bhi fail — free model try karo */ }
  }

  // 3) Auto-fallback: free Pollinations (sirf jab preferred pollinations na ho — warna repeat hai)
  if (model !== "openai") {
    try {
      const freeText = await fetchPollinations("openai", msgs, sys);
      logLine("[AI] auto-fallback: \"" + model + "\" fail hua — free Pollinations model se jawab mila.", "warn");
      return freeText;
    } catch (pErr) { /* sab fail — original error report karo */ }
  }

  // 4) Sab fail — original error throw karo (UI mein asli message dikhega)
  throw prefErr;
}

/* COMMANDS keys ko word-boundary se match karo — "disconnect spotify" ko "connect spotify"
   se galat match nahi hoga (includes() substring bug tha). */
const COMMAND_RE = new Map();
function commandKeyFor(t) {
  for (const k of Object.keys(COMMANDS)) {
    if (!COMMAND_RE.has(k)) {
      COMMAND_RE.set(k, new RegExp("\\b" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i"));
    }
    if (COMMAND_RE.get(k).test(t)) return k;
  }
  return null;
}

function checkCommand(input) {
  const t = input.toLowerCase();
  const key = commandKeyFor(t);
  if (key) return COMMANDS[key]();

  // ── Power commands (inhe poori text chahiye) ──
  const searchM = t.match(/^(?:search|google)\s+(.+)/);
  if (searchM) { window.open("https://www.google.com/search?q=" + encodeURIComponent(searchM[1])); logLine("[ACTION] google search: " + searchM[1].slice(0, 50), "ok"); return `Searching for "${searchM[1].slice(0, 60)}", sir.`; }
  // Spotify pehle — "play X on spotify" ko YouTube mat bhejo
  const spPlayM = t.match(/^play\s+(.+?)\s+on\s+spotify\b/i);
  if (spPlayM) {
    const q = spPlayM[1].trim();
    if (!window.SPOTIFY) return "SPOTIFY module load nahi hua, sir.";
    if (!window.SPOTIFY.isConnected()) return "Spotify connected nahi hai, sir — Settings → Spotify → CONNECT (ya \"connect spotify\" bolo).";
    window.SPOTIFY.playQuery(q).catch(() => {});
    logLine("[SPOTIFY] ▶ " + q, "ok");
    return "Spotify mein \"" + q + "\" khol raha hoon, sir — top result Spotify app mein chala jayega. Aur bhi results ke liye: \"spotify search " + q + "\".";
  }
  const playM = t.match(/^play\s+(.+?)\s+on\s+youtube\b|^play\s+music\b|^play\s+(.+)/);
  if (playM) { const q = playM[1] || playM[2] || playM[3] || ""; window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(q)); logLine("[ACTION] youtube: " + (q || "music"), "ok"); return "Chala raha hoon, sir: " + (q || "music") + "."; }
  const remindM = t.match(/remind\s+me\s+(.+?)\s+in\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)/);
  if (remindM) return reminderAdd(remindM[1], parseInt(remindM[2], 10), remindM[3] || "m");
  const timerM = t.match(/\b(?:set\s+)?timer\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)?/);
  if (timerM) return startTimer(parseInt(timerM[1], 10), timerM[2] || "s");
  const noteM = t.match(/^note\s+(.+)/);
  if (noteM) return noteAdd(noteM[1]);

  // ── CUSTOM WAKE WORD (text se bhi set/reset karo) ──
  const wwSet = t.match(/^(?:set|change)\s+(?:the\s+)?wake\s+word\s+(?:to|as)\s+(.+)/);
  if (wwSet) {
    const v = normWakeText(wwSet[1].trim()); // Devanagari mein type kiya ho toh Latin mein
    if (!v || v.split(/\s+/).length > 4) return "1–4 words, sir — e.g. \"set wake word to ok computer\".";
    wakePhrase = v.toLowerCase();
    wakeTokens = wakeWords(wakePhrase);
    saveLS(LS_WAKE, { phrase: wakePhrase, tokens: wakeTokens });
    if (wakeInput) wakeInput.value = wakePhrase;
    logLine("[WAKE] Custom wake word set: \"" + wakePhrase + "\"", "ok");
    return "Wake word set: \"" + wakePhrase + "\", sir. Ab yeh bolo toh jawab milega.";
  }
  if (/^(?:reset|remove)\s+(?:the\s+)?wake\s+word\b/.test(t)) {
    wakePhrase = null; wakeTokens = [];
    try { localStorage.removeItem(LS_WAKE); } catch (e) { /* noop */ }
    if (wakeInput) wakeInput.value = "";
    logLine("[WAKE] Reset — \"Hey Jarvis\" wapas default", "warn");
    return "Wake word reset, sir — \"Hey Jarvis\" wapas. Settings → TRAIN se apna bhi bana sakte ho.";
  }

  // ── LEARNING commands (local memory) ──
  if (window.LEARN) {
    const lm = t.match(/(?:yaad rakh|sikha de|yaad rakho|note this|remember)\s+(.+)/);
    if (lm) {
      window.LEARN.addLesson(lm[1].slice(0, 60), lm[1]);
      return `Noted, sir. Maine yeh seekh liya: "${lm[1].slice(0, 100)}". Ab yaad rakhunga — jab bhi related baat hogi, isko respect karunga. (Local memory — pattern recall, real training nahi.)`;
    }
    if (/kya (seekha|sikha)|(?:kya|kaunse) lessons|seekha kya/.test(t)) {
      const n = window.LEARN.count();
      if (!n) return "Abhi tak koi lesson nahi, sir. Galat jawab par ✘ dabao ya \"yaad rakh …\" bolo — phir main seekhunga.";
      return "Yeh seekha hai, sir:\n" + window.LEARN.list();
    }
    const isQuestion = /[?？]/.test(t) || /\b(what|why|how|when|kyun|kya|kaise|kaun)\b/.test(t);
    if (!isQuestion && /(galat|wrong|sahi nahi|theek nahi|bakwas)/.test(t) && lastExchange.assistant) {
      window.LEARN.addLesson(String(lastExchange.user || "chat").slice(0, 50), "user ne bataya ki yeh reply galat tha");
      return "Point noted, sir — wo reply galat tha. Isse main avoid karunga aur aage behtar jawab dunga. ✘ button se bhi seekh sakte ho.";
    }
    if (/(^|\s)(forget|bhool ja|memory clear)(\s|$)/.test(t)) {
      window.LEARN.wipe();
      return "Memory purged, sir. Saari lessons aur error-history delete ho gayi.";
    }
  }

  // standalone "hack/hacking/hacker" → context-aware: learning/apna system = full help, dusre ka = boundary
  if (/(^|\s)hack(ing|er|ed|s)?(\s|$)/.test(t)) {
    // (a) LEARNING context — legal, full support
    if (/(seekh|sikha|sikh|learn|study|course|practice|train|kaise (bana|sikhe)|how to (learn|become))/i.test(t)) return HACK_LEARN_REPLY();
    // (b) DEFENSE — hackers se bachna/bachana (100% legal, priority sabse pehle)
    if (/(bachau|bachao|bacha|protect|secure|save|avoid|prevent)/i.test(t)) return HACK_DEFEND_REPLY();
    // (c) kisi AUR ke system/account par attack → firm boundary (crime)
    if (/(kisi (ka|ke|ki|aur)|friend|dost|girlfriend|boyfriend|gf|wife|husband|bhai|behen|sister|brother|mother|father|mummy|papa|family|cousin|uncle|teacher|boss|uska|uski|uske|unka|unki|padosi|neighbor|\bhis\b|\bher\b|\btheir\b)/i.test(t)) return HACK_BOUNDARY_REPLY();
    // (d) APNA / authorized / test lab → real toolkit launch (100% legal)
    if (/(meri|mera|mere|apna|apni|apne|\bmy\b|\bown\b|khud|authorized|authorise|test|practice|lab|ctf|honeypot|sandbox)/i.test(t)) {
      try { if (window.HACK) window.HACK.launch("arsenal"); } catch (e) { /* noop */ }
      return HACK_OWN_REPLY();
    }
    return HACK_BOUNDARY_REPLY();
  }
  return null;
}

/* Kya yeh baat sawaal hai (question) — command jaise destructive actions isse trigger nahi honge.
   Note: "can you shutdown my pc" jaise polite orders abhi bhi execute honge (order hai, sawaal nahi). */
function isQuestionish(t) {
  return /[?？]/.test(t) || /^(how|what|why|when|is it|does it|kyun|kaise|kya)\b/.test(t);
}

/* ═══════════ MAIN FLOW ═══════════ */

async function handleUserInput(text, img) {
  if (!text && !img) return;
  if (text === "jarvis-ack") {
    textInput.value = "";
    const b = addJarvisBubble();
    typewriter(b, "Haan, sir? Boliye. Main sun raha hoon.", () => speakText("Haan sir, boliye."));
    return;
  }
  textInput.value = "";
  firstInteract = false;
  if (!text && img) text = "📷 Image attach ki hai, sir — isse dekh kar batao kya hai.";
  addUserMsg(text, img);
  const userMsg = { role: "user", content: text };
  if (img && img.data) userMsg.image = { data: img.data, mime: img.mime || "image/jpeg" };
  conversation.push(userMsg);
  logLine("[INTENT] " + analyzeIntent(text) + (img ? " + IMAGE (vision)" : ""), "ok");

  setState("thinking");
  const thinkingEl = addThinking();

  try {
    // Fast offline-ish commands first (image attach par local commands skip — Gemini vision hi answer dega)
    const cmdReply = img ? null : checkCommand(text);
    let reply = cmdReply;

    // System actions: shutdown / restart / lock (25s delay + cancel) — via server whitelist
    if (!reply && !img) {
      const low = text.toLowerCase();
      const question = isQuestionish(low); // "how to shutdown" jaise sawaal ko PC control nahi samjhenge
      const cancelM = /cancel\s*(?:the\s*)?shutdown|stop\s*shutdown|shutdown\s*cancel/.test(low);
      if (cancelM) {
        logLine("[ACTION] cancel shutdown", "ok");
        try {
          const r = await apiFetch("/api/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel_shutdown" }) });
          reply = r.ok ? "Shutdown cancel kar diya, sir. System safe hai." : "Cancel command server tak nahi pahunchi.";
        } catch (e) { reply = "Cancel ke liye local server chahiye, sir (start.bat)."; }
      } else {
        let sysAction = null, sysName = "";
        if (/\b(?:shutdown|shut\s*down)\b/.test(low)) { sysAction = "shutdown"; sysName = "PC shutdown"; }
        else if (/\b(?:restart|reboot)\b/.test(low)) { sysAction = "restart"; sysName = "PC restart"; }
        else if (/\block\b/.test(low)) { sysAction = "lock"; sysName = "PC lock"; }
        if (sysAction && !question) {
          logLine("[ACTION] " + sysAction, "warn");
          try {
            const r = await apiFetch("/api/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: sysAction }) });
            reply = r.ok ? (sysAction === "lock" ? "PC lock ho gaya, sir." : sysName + " 25 second mein hoga, sir. \"cancel shutdown\" bolo to rok dunga.") : "System action fail hua, sir (server issue).";
          } catch (e) { reply = "Iske liye local server chahiye, sir — start.bat se chalao."; }
        }
      }
    }

    // Open local apps via server (whitelist — e.g. "open notepad")
    if (!reply && !img) {
      const low2 = text.toLowerCase();
      const openM = low2.match(/\bopen (notepad|calculator|cmd|command prompt|terminal|paint|explorer|chrome|task manager|spotify)\b/);
      if (openM && !isQuestionish(low2)) { // "how to open notepad" = sawaal, action nahi
        const app = (openM[1] === "command prompt" || openM[1] === "terminal") ? "cmd" : openM[1];
        logLine("[ACTION] open " + app, "ok");
        try {
          const r = await apiFetch("/api/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: app })
          });
          reply = r.ok ? "Opening " + openM[1] + ", sir. Done." : "App open nahi hui, sir — server ne mana kar diya (start.bat se chalao).";
        } catch (e) {
          reply = "App open karne ke liye local server chahiye, sir — start.bat se chalao. Tab main notepad, calculator, cmd waghera khol sakta hoon.";
        }
      }
    }

    // Hack toolkit commands (simulations)
    if (!reply && !img && window.HACK) {
      const tool = HACK.matchTool(text);
      if (tool) {
        HACK.launch(tool.id, tool.param);
        reply = TOOL_REPLIES[tool.id] || "Tool launched, operator.";
      }
    }

    if (!reply) {
      reply = await fetchReply();
    }

    removeThinking(thinkingEl);
    conversation.push({ role: "assistant", content: reply });
    lastExchange = { user: text, assistant: reply };
    saveChat();

    const bubble = addJarvisBubble();
    typewriter(bubble, reply, () => speakText(reply));
    if (document.hidden) notifyJarvis(reply);
  } catch (err) {
    console.error("AI error:", err);
    removeThinking(thinkingEl);
    const bubble = addJarvisBubble();
    let msg = "Sorry sir, I lost my connection to the mainframe. Check your internet and try again — my genius remains available either way.";
    if (err && err.message && err.message.indexOf("DEEPSEEK_ERR:") === 0) {
      msg = "DeepSeek issue, sir: " + err.message.slice(12) + " — start.bat se server chalao aur config.json mein apni key daalo. (Ya settings mein free model choose kar lo.)";
    }
    if (err && err.message && err.message.indexOf("GEMINI_ERR:") === 0) {
      const gemMsg = err.message.slice(11);
      msg = "Gemini issue, sir: " + gemMsg + (/key|API/i.test(gemMsg)
        ? " — Settings mein key daalo, ya start.bat se server chalao (config.json mein google_api_key set hai to wahi use hogi)."
        : " — Settings → AI Model mein koi doosra model try karo, ya start.bat se server chalao (config.json ki key tab use hoti hai).");
    }
    // ── LEARNING from mistakes: error logged, pattern surfaced ──
    if (window.LEARN) {
      window.LEARN.addError(modelSelect.value, err && err.message ? err.message.slice(0, 80) : "network");
      const fails = window.LEARN.failCount(modelSelect.value);
      if (fails > 1) msg += " (Learning note: is model ke saath " + fails + " failures ho chuke hain — main isse seekh raha hoon; model badalne par bhi consider karo.)";
    }
    setState("error", "Connection to AI failed");
    typewriter(bubble, msg, () => { setState("idle"); scheduleResumeVoice(); });
  }
}

/* ═══════════ EVENTS ═══════════ */

sendBtn.addEventListener("click", () => {
  const v = textInput.value.trim();
  if (v || pendingImage) handleUserInput(v, pendingImage);
  clearPendingImage();
});

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const v = textInput.value.trim();
    if (v || pendingImage) handleUserInput(v, pendingImage);
    clearPendingImage();
  }
});

/* ═══════════ IMAGE ATTACH (Gemini vision) ═══════════ */

imgBtn.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  attachImage(file).catch(err => {
    logLine("[IMAGE] attach fail: " + (err && err.message ? err.message : "unknown"), "warn");
  });
  imageInput.value = "";
});
imgPreviewClear.addEventListener("click", clearPendingImage);

function clearPendingImage() {
  pendingImage = null;
  if (imgPreview) imgPreview.hidden = true;
  if (imgBtn) imgBtn.classList.remove("attached");
}

function attachImage(file) {
  // Size limit — bada image Gemini payload ko slow/block kar sakta hai
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image 10MB se bada hai, sir — chhota image choose karo.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File padhne mein error"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ye image kharab lag rahi hai, sir — doosri try karo."));
      img.onload = () => {
        // Compress — 1024px tak + JPEG 0.85 (PNG transparent ho toh PNG rakho)
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, 0.85);
        pendingImage = {
          data: dataUrl.slice(dataUrl.indexOf(",") + 1),
          mime: mime,
          name: file.name || "image_attached"
        };
        if (imgPreview) {
          imgPreviewThumb.src = dataUrl;
          imgPreviewName.textContent = pendingImage.name;
          imgPreview.hidden = false;
        }
        if (imgBtn) imgBtn.classList.add("attached");
        logLine("[IMAGE] attach: " + pendingImage.name + " (" + canvas.width + "x" + canvas.height + ", " + mime + ")", "ok");
        resolve(pendingImage);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

micBtn.addEventListener("click", startListening);

clearBtn.addEventListener("click", clearChat);

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
overlay.addEventListener("click", closeSettings);

function openSettings() {
  settingsPanel.classList.add("open");
  overlay.classList.add("show");
  loadKeys(); // refresh key placeholders
}
function closeSettings() {
  settingsPanel.classList.remove("open");
  overlay.classList.remove("show");
}

rateRange.addEventListener("input", () => rateVal.textContent = parseFloat(rateRange.value).toFixed(2) + "×");
pitchRange.addEventListener("input", () => pitchVal.textContent = parseFloat(pitchRange.value).toFixed(2));
voiceSelect.addEventListener("change", pickVoice);

soundToggle.addEventListener("change", () => {
  if (window.HACK) HACK.setSound(soundToggle.checked);
});

/* ═══════════ SPOTIFY SETTINGS UI ═══════════ */

function syncSpotifyUI() {
  if (!window.SPOTIFY) return;
  const cid = window.SPOTIFY.getClientId();
  if (spotClientId) spotClientId.value = cid;
  if (spotRedirectUri) spotRedirectUri.textContent = window.SPOTIFY.getRedirectUri();
  if (spotStatus) {
    const on = window.SPOTIFY.isConnected();
    spotStatus.textContent = on ? "● CONNECTED" + (window.SPOTIFY.getUser() ? " — " + window.SPOTIFY.getUser() : "") : "NOT CONNECTED";
    spotStatus.className = "range-val" + (on ? " ok" : "");
  }
}

if (spotConnectBtn) spotConnectBtn.addEventListener("click", () => {
  if (window.SPOTIFY) {
    window.SPOTIFY.setClientId(spotClientId ? spotClientId.value : "");
    syncSpotifyUI();
    const r = window.SPOTIFY.connect();
    if (r && !r.ok) { logLine("[SPOTIFY] " + r.msg, "warn"); }
  }
});
if (spotDisconnectBtn) spotDisconnectBtn.addEventListener("click", () => {
  if (window.SPOTIFY) {
    const r = window.SPOTIFY.disconnect();
    syncSpotifyUI();
    if (r && r.msg) logLine("[SPOTIFY] " + r.msg, "warn");
  }
});

/* ═══════════ API KEY MANAGEMENT ═══════════ */

const geminiKeyInput = $("geminiKeyInput");
const deepseekKeyInput = $("deepseekKeyInput");
const saveKeysBtn = $("saveKeysBtn");
const keysStatus = $("keysStatus");

async function loadKeys() {
  // localStorage se local key (file:// mode ke liye)
  const localGemini = localStorage.getItem("jarvis_gemini_key") || "";
  if (localGemini && geminiKeyInput) {
    geminiKeyInput.placeholder = "*".repeat(Math.max(0, localGemini.length - 4)) + localGemini.slice(-4);
  }
  const localDeepseek = localStorage.getItem("jarvis_deepseek_key") || "";
  if (localDeepseek && deepseekKeyInput) {
    deepseekKeyInput.placeholder = "*".repeat(Math.max(0, localDeepseek.length - 4)) + localDeepseek.slice(-4);
  }
  // Server se masked keys try karo (overrides localStorage if available)
  try {
    const r = await apiFetch("/api/keys");
    if (!r.ok) return;
    const d = await r.json();
    if (d.google_api_key_masked && geminiKeyInput) geminiKeyInput.placeholder = d.google_api_key_masked;
    if (d.deepseek_api_key_masked && deepseekKeyInput) deepseekKeyInput.placeholder = d.deepseek_api_key_masked;
  } catch (e) { /* server off — localStorage already set above */ }
}

if (saveKeysBtn) {
  saveKeysBtn.addEventListener("click", async () => {
    const geminiVal = geminiKeyInput ? geminiKeyInput.value.trim() : "";
    const deepseekVal = deepseekKeyInput ? deepseekKeyInput.value.trim() : "";
    if (!geminiVal && !deepseekVal) {
      if (keysStatus) { keysStatus.textContent = "Kuch dalo pehle!"; keysStatus.className = "range-val"; }
      return;
    }
    // localStorage mein save (file:// mode ke liye — bina server ke bhi chalega)
    if (geminiVal) localStorage.setItem("jarvis_gemini_key", geminiVal);
    if (deepseekVal) localStorage.setItem("jarvis_deepseek_key", deepseekVal);
    // Server try karo (agar chal raha hai)
    try {
      const r = await apiFetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_api_key: geminiVal, deepseek_api_key: deepseekVal })
      });
      const d = await r.json();
      if (d.ok) logLine("[CONFIG] Server par bhi keys saved", "ok");
    } catch (e) { /* server off — localStorage saved, still works */ }
    if (keysStatus) { keysStatus.textContent = "SAVED ✓ (browser + server)"; keysStatus.className = "range-val ok"; }
    if (geminiKeyInput) geminiKeyInput.value = "";
    if (deepseekKeyInput) deepseekKeyInput.value = "";
    loadKeys();
  });
}

// key toggle (show/hide)
document.querySelectorAll(".key-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const inp = $(btn.dataset.target);
    if (inp) inp.type = inp.type === "password" ? "text" : "password";
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSettings();
});

/* ═══════════ HUD WIDGETS ═══════════ */

function logLine(text, cls) {
  if (!sysLog) return;
  const d = document.createElement("div");
  d.className = "sl-line" + (cls ? " sl-" + cls : "");
  d.textContent = text;
  sysLog.appendChild(d);
  while (sysLog.childNodes.length > 60) sysLog.removeChild(sysLog.firstChild);
  sysLog.scrollTop = sysLog.scrollHeight;
}

function initClock() {
  const tick = () => {
    const now = new Date();
    if (clockTime) clockTime.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    if (clockDate) clockDate.textContent = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };
  tick();
  setInterval(tick, 1000);
}

function initCalendar() {
  if (!calGrid) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (calTitle) calTitle.textContent = now.toLocaleDateString([], { month: "long", year: "numeric" }).toUpperCase();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const dows = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  calGrid.innerHTML = "";
  dows.forEach(d => { const s = document.createElement("span"); s.className = "dow"; s.textContent = d; calGrid.appendChild(s); });
  for (let i = 0; i < first; i++) { const b = document.createElement("span"); b.className = "blank"; calGrid.appendChild(b); }
  for (let d = 1; d <= days; d++) {
    const s = document.createElement("span");
    s.textContent = d;
    if (d === now.getDate()) s.classList.add("today");
    calGrid.appendChild(s);
  }
}

function fmtBytes(n) {
  if (n === undefined || n === null || isNaN(n)) return "--";
  const gb = n / (1024 ** 3);
  return gb >= 1 ? gb.toFixed(1) + " GB" : Math.round(n / (1024 ** 2)) + " MB";
}
function fmtUptime(sec) {
  if (!sec && sec !== 0) return "--:--:--";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const mi = Math.floor((sec % 3600) / 60);
  return (d > 0 ? d + "d " : "") + String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0") + ":" + String(Math.floor(sec % 60)).padStart(2, "0");
}
function setGauge(el, valEl, pct) {
  if (!el) return;
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  el.style.setProperty("--p", p);
  if (valEl) valEl.textContent = p + "%";
}

function initGauges() {
  // Fake data kabhi nahi — server na ho toh honest '--'; LINK badge internet par base karta hai
  // (BROWSER mode = app online, sirf gauges server ke bina nahi milte)
  function offline() {
    setGauge(cpuGauge, null, 0);
    setGauge(memGauge, null, 0);
    if (cpuVal) cpuVal.textContent = "--%";
    if (memVal) memVal.textContent = "--%";
    if (cpuTag) cpuTag.textContent = "N/A";
    if (memTag) memTag.textContent = "N/A";
    // HONEST LINK badge: internet hai toh app LIVE hai — AI (Pollinations/keys), weather, network
    // sab BROWSER mode mein chal rahe hain. Server sirf CPU/MEM + config.json keys ke liye chahiye.
    const online = navigator.onLine !== false;
    if (metricsEl) metricsEl.innerHTML = "CPU <b>--</b> | MEM <b>--</b> | LINK <b style=\"color:" + (online ? "var(--teal)" : "var(--amber)") + "\">" + (online ? "LIVE" : "OFFLINE") + "</b>" + (online ? " (BROWSER)" : "");
  }
  async function poll() {
    try {
      const base = await resolveServerBase();
      if (base === null) throw new Error("file-mode");
      const res = await fetch(base + "/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error("http");
      const d = await res.json();
      // Server ONLINE hai → LINK hamesha LIVE. psutil nahi (simulated) ho toh CPU/MEM honest "--" — fake kabhi nahi.
      if (d.simulated || d.cpu == null || d.mem == null) {
        setGauge(cpuGauge, null, 0);
        setGauge(memGauge, null, 0);
        if (cpuVal) cpuVal.textContent = "--%";
        if (memVal) memVal.textContent = "--%";
        if (cpuTag) cpuTag.textContent = "N/A";
        if (memTag) memTag.textContent = "N/A";
      } else {
        if (cpuTag) cpuTag.textContent = "LIVE";
        if (memTag) memTag.textContent = "LIVE";
        setGauge(cpuGauge, cpuVal, d.cpu);
        setGauge(memGauge, memVal, d.mem);
      }
      if (uptimeText) uptimeText.textContent = fmtUptime(d.uptime);
      if (d.disk_total) {
        const usedPct = 100 - (d.disk_free / d.disk_total) * 100;
        if (storageFill) storageFill.style.width = usedPct + "%";
        if (storageText) storageText.textContent = "USED " + fmtBytes(d.disk_total - d.disk_free) + " / " + fmtBytes(d.disk_total);
      }
      if (metricsEl) metricsEl.innerHTML = "CPU <b>" + (d.cpu == null ? "--" : d.cpu + "%") + "</b> | MEM <b>" + (d.mem == null ? "--" : d.mem + "%") + "</b> | LINK <b style=\"color:var(--teal)\">LIVE</b> (SERVER)";
    } catch (e) {
      offline();
    }
  }
  poll();
  setInterval(poll, 3000);
}

const WCODE = { 0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Showers", 82: "Violent showers", 95: "Thunderstorm", 96: "Storm + hail", 99: "Heavy storm + hail" };
const WICON = { 0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️", 45: "🌫", 48: "🌫", 51: "🌦", 53: "🌦", 55: "🌧", 61: "🌧", 63: "🌧", 65: "🌧", 71: "🌨", 73: "🌨", 75: "❄️", 80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈", 96: "⛈", 99: "⛈" };

/* AccuWeather icon (1–44) → emoji. Description (WeatherText/IconPhrase) AccuWeather se hi aata hai — sabse sahi data. */
const AW_ICON = { 1: "☀️", 2: "🌤", 3: "⛅", 4: "⛅", 5: "🌥", 6: "☁️", 7: "☁️", 8: "☁️", 11: "🌫", 12: "🌦", 13: "🌦", 14: "🌦", 15: "⛈", 16: "⛈", 17: "⛈", 18: "🌧", 19: "🌨", 20: "🌨", 21: "🌨", 22: "❄️", 23: "❄️", 24: "🌧", 25: "🌧", 26: "🌧", 29: "🌧", 30: "☀️", 31: "❄️", 32: "💨", 33: "🌙", 34: "🌙", 35: "⛅", 36: "☁️", 37: "🌦", 38: "⛈", 39: "🌦", 40: "⛈", 41: "🌨", 42: "🌨", 43: "❄️", 44: "🌧" };

async function initWeather() {
  try {
    const res = await fetch("https://ipwho.is/");
    if (!res.ok) throw new Error("geo");
    const g = await res.json();
    if (!g || g.success === false || g.latitude === undefined || g.longitude === undefined) throw new Error("geo2");
    if (weatherCity) weatherCity.textContent = (g.city || "?") + ", " + (g.country_code || "");

    // 1) ACCUWEATHER — local server proxy (/api/weather) se; key server-side hai.
    //    Server 10-min cache rakhta hai (AccuWeather free tier ki calls limited hain).
    const aw = await fetchAccuWeather(g.latitude, g.longitude);
    if (aw) {
      weatherNow = { temp: aw.temp, desc: aw.desc, city: aw.city || weatherCity.textContent, provider: "accuweather" };
      if (weatherCity && aw.city) weatherCity.textContent = aw.city;
      if (weatherTemp) weatherTemp.textContent = aw.temp + "°";
      if (weatherDesc) weatherDesc.textContent = aw.desc;
      if (weatherTag) weatherTag.textContent = "ACCUWEATHER";
      if (weatherDays && aw.daily && aw.daily.length) {
        weatherDays.innerHTML = "";
        aw.daily.forEach(d => {
          const div = document.createElement("div");
          div.className = "wday";
          const nm = new Date(d.date + "T00:00:00").toLocaleDateString([], { weekday: "short" });
          div.innerHTML = "<div class=\"wd\">" + nm + "</div><div class=\"wi\">" + (AW_ICON[d.icon] || "•") + "</div><div class=\"wt\">" + d.max + "°</div>";
          weatherDays.appendChild(div);
        });
      }
      return;
    }

    // 2) FALLBACK — open-meteo (no key, free). AccuWeather key/server nahi hai toh honest backup.
    if (weatherTag) weatherTag.textContent = "LIVE";
    const wres = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + g.latitude + "&longitude=" + g.longitude + "&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5");
    if (!wres.ok) throw new Error("meteo");
    const w = await wres.json();
    const cw = w.current_weather || {};
    weatherNow = { temp: Math.round(cw.temperature), desc: WCODE[cw.weathercode] || "—", city: (g.city || "?") + ", " + (g.country_code || ""), provider: "open-meteo" };
    if (weatherTemp) weatherTemp.textContent = Math.round(cw.temperature) + "°";
    if (weatherDesc) weatherDesc.textContent = WCODE[cw.weathercode] || "—";
    if (weatherDays && w.daily) {
      weatherDays.innerHTML = "";
      const days = w.daily.time || [];
      for (let i = 0; i < Math.min(5, days.length); i++) {
        const div = document.createElement("div");
        div.className = "wday";
        const nm = new Date(days[i]).toLocaleDateString([], { weekday: "short" });
        div.innerHTML = "<div class=\"wd\">" + nm + "</div><div class=\"wi\">" + (WICON[w.daily.weathercode[i]] || "•") + "</div><div class=\"wt\">" + Math.round(w.daily.temperature_2m_max[i]) + "°</div>";
        weatherDays.appendChild(div);
      }
    }
  } catch (e) {
    weatherNow = null;
    if (weatherCity) weatherCity.textContent = "offline";
    if (weatherDesc) weatherDesc.textContent = "real weather unavailable";
    if (weatherTag) weatherTag.textContent = "OFFLINE";
  }
}

async function fetchAccuWeather(lat, lon) {
  // Server se AccuWeather — key kabhi browser tak nahi jaati. Fail ho toh null → open-meteo fallback.
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 7000);
    const r = await apiFetch("/api/weather?lat=" + lat + "&lon=" + lon, { cache: "no-store", signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d || d.error || d.temp === undefined || d.temp === null) return null;
    return d;
  } catch (e) {
    return null; // server band / no key / offline — open-meteo fallback
  }
}

function initNetGraph() {
  if (!netCanvas) return;
  const ctx = netCanvas.getContext("2d");
  const W = netCanvas.width, H = netCanvas.height;
  const buf = Array(W).fill(H - 8);
  const SCALE = 1024; // 1 MB/s = full scale (server throughput)
  let prev = null;    // { t, sent, recv } — real byte counters ka delta

  function draw(v) {
    buf.push(H - 8 - Math.max(0, Math.min(1, v)) * (H - 16));
    buf.shift();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,229,255,0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    buf.forEach((val, i) => (i ? ctx.lineTo(i, val) : ctx.moveTo(i, val)));
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,212,160,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 10);
    buf.forEach((val, i) => ctx.lineTo(i, H - 10 + (H - 14 - val) * 0.25));
    ctx.stroke();
  }
  function fmtRate(kbs) {
    return kbs >= 1024 ? (kbs / 1024).toFixed(2) + " MB/s" : kbs.toFixed(0) + " KB/s";
  }
  function label(txt, tag) {
    if (netLabel) netLabel.textContent = txt;
    if (netTag) netTag.textContent = tag;
  }

  let busy = false;
  async function frame() {
    if (busy) return; // overlapping async frames se bacho
    busy = true;
    try {
      // 1) server se REAL throughput (psutil net_io_counters ka per-second delta)
      const base = await resolveServerBase();
      if (base !== null) {
        try {
          const res = await fetch(base + "/api/system", { cache: "no-store" });
          if (res.ok) {
            const d = await res.json();
            if (d && d.net && typeof d.net.sent === "number") {
              const now = Date.now();
              if (prev && prev.t) {
                const dt = Math.max(0.5, (now - prev.t) / 1000);
                const recv = Math.max(0, (d.net.recv - prev.recv) / dt / 1024);
                const sent = Math.max(0, (d.net.sent - prev.sent) / dt / 1024);
                draw(recv / SCALE);
                label("↓ " + fmtRate(recv) + "  ↑ " + fmtRate(sent), "LIVE");
              } else {
                draw(0);
                label("measuring…", "LIVE");
              }
              prev = { t: now, sent: d.net.sent, recv: d.net.recv };
              return;
            }
          }
        } catch (e) { /* fall through */ }
        prev = null;
      }
      // 2) browser ka REAL connection estimate (Navigator Connection API)
      const nc = navigator.connection;
      if (nc && typeof nc.downlink === "number" && nc.downlink > 0) {
        draw(nc.downlink / 50); // 50 Mbps = full scale
        label("↓ " + nc.downlink + " Mbps (real)" + (typeof nc.rtt === "number" ? " · RTT " + nc.rtt + "ms" : ""), "BROWSER");
        return;
      }
      // 3) koi bhi real data nahi — fake kabhi nahi, honest flat line
      draw(0);
      label("no live data — server (start.bat) se real stats", "N/A");
    } finally {
      busy = false;
    }
  }

  label("measuring…", "N/A");
  frame();
  setInterval(frame, 2000);
  if (navigator.connection && navigator.connection.addEventListener) {
    navigator.connection.addEventListener("change", frame);
  }
}  /* ── Media deck — REAL audio player (apni music files, fully local + real FFT visualizer) ── */
const MEDIA = {
  audio: null,      // HTMLAudioElement
  ctx: null,        // AudioContext
  analyser: null,   // AnalyserNode — REAL frequency data
  source: null,     // MediaElementSource
  raf: null,        // requestAnimationFrame id
  url: null,        // active object URL (cleanup ke liye)
  queue: [],        // File[] — loaded tracks
  idx: -1,
  playing: false
};

function mediaOpen() {
  const inp = document.getElementById("mediaFiles");
  if (inp) inp.click();
}

function mediaLoadFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f.type && f.type.indexOf("audio/") === 0);
  if (!files.length) { if (mediaNow) mediaNow.textContent = "— NO AUDIO FILES —"; return; }
  const hadTracks = MEDIA.queue.length > 0;
  MEDIA.queue = files;
  if (!hadTracks) MEDIA.idx = 0; // pehli baar load — track 0 se shuru; warna current track preserve
  logLine("[MEDIA] " + files.length + " track(s) loaded — " + files[0].name, "ok");
  mediaStart();
}

function mediaEnsureGraph() {
  if (!MEDIA.audio) {
    MEDIA.audio = new Audio();
    MEDIA.audio.addEventListener("ended", () => mediaNextTrack());
  }
  if (!MEDIA.ctx) {
    try {
      MEDIA.ctx = new (window.AudioContext || window.webkitAudioContext)();
      MEDIA.analyser = MEDIA.ctx.createAnalyser();
      MEDIA.analyser.fftSize = 256;
      MEDIA.analyser.smoothingTimeConstant = 0.82;
      MEDIA.source = MEDIA.ctx.createMediaElementSource(MEDIA.audio);
      MEDIA.source.connect(MEDIA.analyser);
      MEDIA.analyser.connect(MEDIA.ctx.destination);
    } catch (e) { MEDIA.ctx = null; }
  }
  if (MEDIA.ctx && MEDIA.ctx.state === "suspended") { try { MEDIA.ctx.resume(); } catch (e) { /* noop */ } }
}

function mediaStart() {
  if (!MEDIA.queue.length) { mediaOpen(); return; } // koi track nahi — picker kholo
  mediaEnsureGraph();
  const f = MEDIA.queue[MEDIA.idx];
  if (MEDIA.url) { try { URL.revokeObjectURL(MEDIA.url); } catch (e) { /* noop */ } }
  MEDIA.url = URL.createObjectURL(f);
  MEDIA.audio.src = MEDIA.url;
  const p = MEDIA.audio.play();
  const onPlay = () => {
    MEDIA.playing = true;
    if (mediaNow) mediaNow.textContent = "♪ " + f.name;
    logLine("[MEDIA] ▶ " + f.name, "ok");
    mediaDrawLoop();
    // REAL media session — OS media keys + lock screen
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: f.name, artist: "J.A.R.V.I.S", album: "LOCAL DECK" });
      navigator.mediaSession.setActionHandler("play", mediaStart);
      navigator.mediaSession.setActionHandler("pause", mediaPauseTrack);
      navigator.mediaSession.setActionHandler("nexttrack", mediaNextTrack);
    } catch (e) { /* noop */ }
  };
  if (p && typeof p.then === "function") p.then(onPlay).catch(() => { if (mediaNow) mediaNow.textContent = "⚠ play failed: " + f.name; });
  else onPlay();
}

function mediaPauseTrack() {
  if (!MEDIA.audio) return;
  MEDIA.audio.pause();
  MEDIA.playing = false;
  if (MEDIA.raf) cancelAnimationFrame(MEDIA.raf);
  if (mediaNow && MEDIA.queue[MEDIA.idx]) mediaNow.textContent = "⏸ " + MEDIA.queue[MEDIA.idx].name;
}

function mediaStopTrack() {
  if (!MEDIA.audio) return;
  MEDIA.audio.pause();
  MEDIA.audio.removeAttribute("src");
  MEDIA.audio.load();
  MEDIA.playing = false;
  if (MEDIA.url) { try { URL.revokeObjectURL(MEDIA.url); } catch (e) { /* noop */ } MEDIA.url = null; }
  if (MEDIA.raf) cancelAnimationFrame(MEDIA.raf);
  if (mediaCanvas) {
    const ctx = mediaCanvas.getContext("2d");
    ctx.clearRect(0, 0, mediaCanvas.width, mediaCanvas.height);
  }
  if (mediaNow) mediaNow.textContent = "— STANDBY —";
}

function mediaNextTrack() {
  if (!MEDIA.queue.length) { mediaOpen(); return; }
  MEDIA.idx = (MEDIA.idx + 1) % MEDIA.queue.length;
  if (MEDIA.playing) mediaStart();
  else if (mediaNow) mediaNow.textContent = "♪ " + MEDIA.queue[MEDIA.idx].name;
}

/* REAL visualizer — AnalyserNode ke REAL frequency data se (koi fake sin bars nahi) */
function mediaDrawLoop() {
  if (!mediaCanvas || !MEDIA.analyser) return;
  const ctx = mediaCanvas.getContext("2d");
  const W = mediaCanvas.width, H = mediaCanvas.height;
  const data = new Uint8Array(MEDIA.analyser.frequencyBinCount);
  const bars = 28;
  const step = Math.max(1, Math.floor(data.length / bars));
  (function draw() {
    if (!MEDIA.playing) return;
    ctx.clearRect(0, 0, W, H);
    MEDIA.analyser.getByteFrequencyData(data);
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const h = Math.max(2, v * (H - 10));
      ctx.fillStyle = (i % 2) ? "rgba(0,212,160,0.85)" : "rgba(0,229,255,0.85)";
      ctx.fillRect(i * (W / bars), H - h, W / bars - 2, h);
    }
    MEDIA.raf = requestAnimationFrame(draw);
  })();
}

function initMedia() {
  const fileInput = document.getElementById("mediaFiles");
  const loadBtn = document.getElementById("mediaLoad");
  if (loadBtn) loadBtn.addEventListener("click", mediaOpen);
  if (fileInput) fileInput.addEventListener("change", () => { mediaLoadFiles(fileInput.files); fileInput.value = ""; });
  if (mediaPlay) mediaPlay.addEventListener("click", mediaStart);
  if (mediaPause) mediaPause.addEventListener("click", mediaPauseTrack);
  if (mediaStop) mediaStop.addEventListener("click", mediaStopTrack);
  if (mediaNext) mediaNext.addEventListener("click", mediaNextTrack);
  // drag & drop — koi bhi audio file deck par girao
  const deck = document.getElementById("mediaDeck");
  if (deck) {
    deck.addEventListener("dragover", (e) => { e.preventDefault(); deck.classList.add("drag"); });
    deck.addEventListener("dragleave", () => deck.classList.remove("drag"));
    deck.addEventListener("drop", (e) => {
      e.preventDefault();
      deck.classList.remove("drag");
      if (e.dataTransfer && e.dataTransfer.files) mediaLoadFiles(e.dataTransfer.files);
    });
  }
}

/* ── Intent analyzer: yeh baat FOLLOW karni hai ya sirf baat hai? ── */
function analyzeIntent(input) {
  const t = input.toLowerCase();
  if (commandKeyFor(t)) return "QUICK_CMD — execute karna hai";
  if (/^(?:set|change)\s+(?:the\s+)?wake\s+word\b|reset\s+(?:the\s+)?wake\s+word\b/.test(t)) return "QUICK_CMD — wake word configure";
  if (/\bopen (notepad|calculator|cmd|command prompt|terminal|paint|explorer|chrome|task manager|spotify)\b/.test(t)) return "ACTION — app open karna hai";
  if (window.HACK && HACK.matchTool(input)) return "TOOL — security toolkit chalaana hai";
  if (/\b(?:shutdown|shut\s*down|restart|reboot)\b/.test(t) || /lock\s+(?:the\s+)?(?:pc|computer|system)\b/.test(t)) return "ACTION — system control";
  if (/(^|\s)hack(ing|er|ed|s)?(\s|$)/.test(t)) return "BOUNDARY — illegal request, mana";
  return "CHAT — normal baat, AI reply";
}

/* ═══════════ CUSTOM WAKE WORD — speech-to-text training ═══════════ */

const LS_WAKE = "jarvis_wakephrase_v1";

/* Text ka chhota token cleaner (punctuation hatao, lowercase) */
function wakeWords(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

function setWakeStatus(msg, cls) {
  if (!wakeStatus) return;
  wakeStatus.textContent = msg;
  wakeStatus.className = "range-val" + (cls ? " " + cls : "");
}

/* Devanagari text ho toh phonetic Latin banao (wake phrase/text se set karne par) */
function normWakeText(s) {
  return /[\u0900-\u097F]/.test(String(s || "")) ? devaToLatin(s) : String(s || "");
}

/* Devanagari (Hindi) → phonetic Latin. Chrome ka Hindi STT "hey jarvis" ko "हे जार्विस"
   likh deta hai — wake word aur aage ki processing ke liye transcript ko Latin mein badlo. */
function devaToLatin(s) {
  const CON = { "\u0915": "k", "\u0916": "kh", "\u0917": "g", "\u0918": "gh", "\u0919": "ng",
    "\u091A": "ch", "\u091B": "chh", "\u091C": "j", "\u091D": "jh", "\u091E": "ny",
    "\u091F": "t", "\u0920": "th", "\u0921": "d", "\u0922": "dh", "\u0923": "n",
    "\u0924": "t", "\u0925": "th", "\u0926": "d", "\u0927": "dh", "\u0928": "n",
    "\u092A": "p", "\u092B": "ph", "\u092C": "b", "\u092D": "bh", "\u092E": "m",
    "\u092F": "y", "\u0930": "r", "\u0932": "l", "\u0935": "v", "\u0936": "sh",
    "\u0937": "sh", "\u0938": "s", "\u0939": "h" };
  const VOW = { "\u0905": "a", "\u0906": "a", "\u0907": "i", "\u0908": "i", "\u0909": "u", "\u090A": "u",
    "\u090B": "ri", "\u090F": "e", "\u0910": "ai", "\u0913": "o", "\u0914": "au" };
  const MAT = { "\u093E": "a", "\u093F": "i", "\u0940": "i", "\u0941": "u", "\u0942": "u",
    "\u0943": "ri", "\u0947": "e", "\u0948": "ai", "\u094B": "o", "\u094C": "au" };
  let out = "";
  for (const ch of String(s)) {
    if (CON[ch]) out += CON[ch];
    else if (VOW[ch]) out += VOW[ch];
    else if (MAT[ch]) out += MAT[ch];
    else if (ch === "\u0902" || ch === "\u0901") out += "m";   // anusvara / chandrabindu
    else if (ch === "\u0903") out += "h";                       // visarga
    else if (ch === "\u094D" || ch === "\u093C" || ch === "\u093D" || ch === "\u200C" || ch === "\u200D") { /* halant/nukta/joiner — skip */ }
    else if (ch === "\u0964" || ch === "\u0965") out += " ";  // danda
    else if (/\s/.test(ch)) out += " ";
    else out += ch;                                              // Latin / numbers seedha
  }
  return out.trim().replace(/\s+/g, " ");
}

/* Consonant skeleton — "kmpyutar"(Hindi ucharan) vs "computer"(token) ko compare karne ke liye */
function skelKey(w) {
  let s = String(w).toLowerCase().replace(/[^a-z]/g, "");
  s = s.replace(/[cq]/g, "k").replace(/v/g, "w").replace(/z/g, "j").replace(/ph/g, "f").replace(/x/g, "ks");
  return s.replace(/[aeiou]/g, "");
}

/* Skeleton-level match: "computer" ~ "kampyutar". Vowel-only chhote words ("ok" vs "oke") raw compare */
function skelHit(a, b) {
  if (!a || !b) return false;
  const x = skelKey(a), y = skelKey(b);
  if (!x && !y) {
    const A = String(a).toLowerCase(), B = String(b).toLowerCase();
    if (A === B) return true;
    return A.length >= 2 && B.length >= 2 && (A.startsWith(B) || B.startsWith(A));
  }
  if (!x || !y) return false;
  if (x === y) return true;
  const nx = x.replace(/[yw]/g, ""), ny = y.replace(/[yw]/g, "");
  if (nx === ny) return true;
  const n = Math.min(x.length, y.length);
  return n >= 3 && x.slice(0, 3) === y.slice(0, 3);
}

/* Kya transcript wake word hai? Return: command part ("" = sirf wake word bola) ya null (nahi suna) */
function matchWake(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  // Devanagari (Hindi) transcript — pehle Latin mein karo, phir wahi checks
  if (/[\u0900-\u097F]/.test(t)) return matchWake(devaToLatin(t));
  // 1) custom phrase — exact prefix match
  if (wakePhrase) {
    if (t === wakePhrase) return "";
    if (t.startsWith(wakePhrase + " ") || t.startsWith(wakePhrase + ",") || t.startsWith(wakePhrase + ".")) {
      return t.slice(wakePhrase.length).trim();
    }
  }
  // 2) training se seekhe tokens — variant-tolerant ("okay computer" vs "ok computer",
  //    "ok computer" ko Hindi mein "ओके कंप्यूटर" bolne par bhi match)
  if (wakeTokens.length) {
    const hit = (w, tok) => skelHit(w, tok) || w === tok || (w.length >= 2 && tok.length >= 2 && (w.startsWith(tok) || tok.startsWith(w)));
    const words = wakeWords(t);
    const head = words.slice(0, wakeTokens.length + 2);
    const all = wakeTokens.every(tok => head.some(w => hit(w, tok)));
    if (all && head.length) {
      let cut = 0;
      for (let i = 0; i < head.length; i++) {
        if (wakeTokens.some(tok => hit(head[i], tok))) cut = i + 1;
      }
      return words.slice(cut).join(" ");
    }
  }
  // 3) default backup — "hey jarvis" / "jarvis" hamesha kaam karta hai (Hindi spelling variants ke saath)
  const wm = t.match(/^(?:(?:hey|he|hai|hae|ae|ay|ok|oke|okay|okey)\s+)?(?:jarvis|jarvish)[\s,.]*(.*)$/i);
  if (wm) return (wm[1] || "").trim();
  return null;
}

/* TRAINING — user apna wake word 3 baar bolta hai, speech-to-text se seekhte hain ki kaise bolta hai */
function trainWakeWord() {
  if (wakeTraining) return; // pehle se chalu hai — cancel ke liye TRAIN dobara dabao
  if (!micSupported()) { setWakeStatus("Mic not supported — Chrome use karo.", "err"); return; }
  if (isListening) stopListening(); // ek time par ek recognition (conflict na ho)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const samples = [];
  let done = false;
  let attempt = 0;
  let rec = null;

  const finish = (msg, ok) => {
    done = true;
    wakeTraining = null;
    setWakeStatus(msg, ok ? "ok" : "err");
    // training ke baad agar ALWAYS LISTEN / WAKE mode on hai toh wapas sunna shuru
    if (((alwaysListen && alwaysListen.checked) || wakeMode) && !micDenied) {
      setTimeout(() => { if (!isListening && !wakeTraining) startListening(true); }, 400);
    }
  };
  const next = () => {
    if (done) return;
    attempt++;
    if (attempt > 10) { finish("Kuch suna nahi — TRAIN dobara dabao ya text box mein type karo.", false); return; }
    if (attempt > 1) setWakeStatus("Boliye: apna wake word — " + Math.min(attempt, 3) + "/3 (beep ke baad)", "warn");
    try { rec.start(); } catch (e) { finish("Recognition start nahi hua — dobara try karo.", false); }
  };

  rec = new SR();
  wakeTraining = { rec, cancel: () => { done = true; try { rec.abort(); } catch (e) { /* noop */ } } };
  rec.lang = langSelect.value;
  rec.interimResults = false;
  rec.maxAlternatives = 4;
  rec.continuous = false;
  setWakeStatus("🎤 Boliye: apna wake word — 1/3", "warn");

  rec.onresult = (e) => {
    if (done) return;
    let best = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal && r[0] && r[0].transcript && r[0].transcript.trim()) best = r[0].transcript.trim();
    }
    if (best) {
      samples.push(normWakeText(best)); // Hindi (Devanagari) transcript → Latin, taaki tokens banein
      if (window.HACK) window.HACK.beep(660, 0.12, "square", 0.05);
      if (samples.length >= 3) { finishWakeTraining(samples, finish); return; }
      // restart sirf onend se hoga (double start race → InvalidStateError se bachne ke liye)
    }
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") finish("Mic permission denied — address bar se allow karo.", false);
    else if (e.error !== "no-speech" && e.error !== "aborted") finish("Error: " + e.error, false);
  };
  rec.onend = () => { if (!done && samples.length < 3) next(); };
  next();
}

/* 3 samples se phrase + tokens banao — variants merge karo ("ok"+"okay" ek hi word) */
function finishWakeTraining(samples, finish) {
  const freq = {};
  const order = [];
  samples.forEach(s => wakeWords(s).forEach(w => {
    if (!(w in freq)) { freq[w] = 0; order.push(w); }
    freq[w]++;
  }));
  // variant groups: jo words ek dusre ke prefix hain ("ok"+"okay") → sabse common wala rakho
  const groups = [];
  order.forEach(w => {
    const g = groups.find(grp => grp.some(x => x.startsWith(w) || w.startsWith(x)));
    if (g) g.push(w); else groups.push([w]);
  });
  const sig = groups.map(g => g.sort((a, b) => freq[b] - freq[a])[0]).filter(w => w.length >= 2);
  sig.sort((a, b) => freq[b] - freq[a]);
  const keep = sig.filter(w => freq[w] >= 2 || order.length <= 2 || sig.length === 1);
  if (!keep.length) keep.push(sig[0] || "");
  const phrase = keep.slice(0, 4).join(" ");
  // garbage protection: kam se kam ek 3+ char ka asli word chahiye ("um um um" wake word nahi banega)
  if (!phrase.trim() || !phrase.split(" ").some(w => w.length >= 3)) {
    finish("Kuch asli word suna nahi — dobara try karo, ya text box mein type karo.", false);
    return;
  }
  wakePhrase = phrase;
  wakeTokens = keep.slice(0, 4);
  saveLS(LS_WAKE, { phrase: wakePhrase, tokens: wakeTokens });
  if (wakeInput) wakeInput.value = wakePhrase;
  logLine("[WAKE] Trained \"" + wakePhrase + "\" — " + samples.length + " samples se", "ok");
  finish("Trained ✓ Wake word: \"" + wakePhrase + "\"", true);
}

/* ═══════════ PRODUCTIVITY ENGINE — timers, reminders, notes ═══════════ */

const LS_NOTES = "jarvis_notes_v1";
const LS_REMINDERS = "jarvis_reminders_v1";
const LS_CHAT = "jarvis_chat_v1";

function loadLS(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? def : v; } catch (e) { return def; } }
function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }

notes = loadLS(LS_NOTES, []);
reminders = loadLS(LS_REMINDERS, []);

function unitMs(n, unit) {
  const u = String(unit || "s").toLowerCase();
  if (u.startsWith("h")) return n * 3600000;
  if (u.startsWith("m")) return n * 60000;
  return n * 1000;
}
function startTimer(n, unit) {
  const ms = unitMs(n, unit);
  if (ms > 86400000 * 24) return "Timer sirf 24 din tak set ho sakta hai, sir — itna lamba nahi chalta.";
  if (timerActive) clearTimeout(timerActive);
  timerActive = setTimeout(() => {
    timerActive = null;
    logLine("[TIMER] done — " + n + " " + unit, "ok");
    notifyJarvis("Timer done, sir: " + n + " " + unit);
    speakText("Timer done, sir.");
    if (window.HACK) { window.HACK.beep(880, 0.2, "square", 0.06); setTimeout(() => window.HACK.beep(880, 0.2, "square", 0.06), 260); }
  }, ms);
  return "Timer set: " + n + " " + unit + ", sir. Main bata dunga.";
}
function reminderAdd(text, n, unit) {
  const due = Date.now() + unitMs(n, unit);
  reminders.push({ text: String(text).slice(0, 120), due: due });
  if (reminders.length > 30) reminders = reminders.slice(-30);
  saveLS(LS_REMINDERS, reminders);
  logLine("[REMINDER] set: " + text + " (" + n + " " + unit + ")", "ok");
  return "Reminder set, sir: \"" + text + "\" — " + n + " " + unit + " mein. Main khud bata dunga.";
}
function reminderCheck() {
  const now = Date.now();
  const due = reminders.filter(r => r.due <= now);
  if (!due.length) return;
  reminders = reminders.filter(r => r.due > now);
  saveLS(LS_REMINDERS, reminders);
  due.forEach(r => {
    logLine("[REMINDER] ⏰ " + r.text, "ok");
    notifyJarvis("Reminder, sir: " + r.text);
    speakText("Reminder, sir: " + r.text);
  });
}
function reminderList() {
  if (!reminders.length) return "Koi pending reminder nahi, sir.";
  return "Pending reminders:\n" + reminders.map((r, i) => (i + 1) + ". " + r.text + " — " + new Date(r.due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })).join("\n");
}
function reminderClear() { reminders = []; saveLS(LS_REMINDERS, reminders); return "Saare reminders clear, sir."; }
function noteAdd(t) {
  notes.push({ text: String(t).slice(0, 200), ts: Date.now() });
  if (notes.length > 50) notes = notes.slice(-50);
  saveLS(LS_NOTES, notes);
  return "Note saved, sir.";
}
function noteList() {
  if (!notes.length) return "Koi note nahi hai, sir. \"note <text>\" se save karo.";
  return "Notes:\n" + notes.slice(-8).reverse().map((n, i) => (i + 1) + ". " + n.text).join("\n");
}
function noteClear() { notes = []; saveLS(LS_NOTES, notes); return "Saare notes delete, sir."; }

/* ── Chat persistence: last session yaad rehta hai ── */
function saveChat() {
  // Images base64 hain — localStorage quota na bhar jaye isliye sirf aakhri 6 messages
  // mein image rakhte hain, baaki ki strip kar dete hain (text safe rehta hai).
  const recent = conversation.slice(-60);
  const saved = recent.map((m, i) => {
    if (m.image && i < recent.length - 6) { const c = { ...m }; delete c.image; return c; }
    return m;
  });
  try { localStorage.setItem(LS_CHAT, JSON.stringify(saved)); }
  catch (e) {
    // Phir bhi quota full — sab images strip karke retry
    try {
      const plain = saved.map(m => { if (m.image) { const c = { ...m }; delete c.image; return c; } return m; });
      localStorage.setItem(LS_CHAT, JSON.stringify(plain));
    } catch (e2) { /* noop */ }
  }
}
function restoreChat() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_CHAT));
    if (!Array.isArray(arr) || !arr.length) return;
    conversation = arr;
    arr.forEach(m => {
      if (m.role === "user") { addUserMsg(m.content, m.image || null); }
      else { const b = addJarvisBubble(); b.textContent = m.content; }
    });
    logLine("[MEMORY] last session restored — " + arr.length + " messages", "ok");
  } catch (e) { /* noop */ }
}

/* ── Fun ── */
const JOKES = [
  "Main chai piye bina kaam karta hoon — kyunki mujhe chai ki zaroorat hi nahi, sir.",
  "Mere paas 2GB RAM hai aur 100% swag — baaki sab technical details hain.",
  "Computers fast hain, par main unse bhi fast hoon. Almost.",
  "Mujhe sleep mode nahi chahiye — main toh 24/7 standby mein hoon, sir.",
  "Error 404: motivation nahi mila. Thoda coffee bhi chahiye, sir?"
];
const FACTS = [
  "Ek human brain mein ~86 billion neurons hote hain — mere RAM se zyada storage.",
  "Pehla computer bug ek literal moth tha jo relay mein phas gaya tha, 1947 mein.",
  "Internet ka total weight sirf 50 grams bataya jata hai — electrons ka mass.",
  "Ek second mein 8,000,000,000,000,000,000 operations — aaj ke processors par.",
  "Wi-Fi 6E 6 GHz band use karta hai — jaldi aur kam interference."
];

/* ═══════════ BACKGROUND MODE ═══════════ */

function applyBgUI() {
  if (bgBtn) bgBtn.classList.toggle("active", bgMode);
  if (bgToggle) bgToggle.checked = bgMode;
  document.title = bgMode
    ? (document.hidden ? "J.A.R.V.I.S ● BG-ACTIVE ●" : "J.A.R.V.I.S — BG MODE")
    : "J.A.R.V.I.S — Cyberpunk Assistant";
}

function notifyJarvis(body) {
  if (!bgMode || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try { new Notification("J.A.R.V.I.S", { body: String(body).slice(0, 140) }); } catch (e) { /* noop */ }
  }
}

function enableBg() {
  bgMode = true;
  localStorage.setItem("jarvis_bgmode", "on");
  applyBgUI();
  if ("Notification" in window && Notification.permission === "default") {
    try { Notification.requestPermission(); } catch (e) { /* noop */ }
  }
}

function disableBg() {
  bgMode = false;
  localStorage.setItem("jarvis_bgmode", "off");
  applyBgUI();
}

if (bgBtn) bgBtn.addEventListener("click", () => bgMode ? disableBg() : enableBg());
if (bgToggle) bgToggle.addEventListener("change", () => bgToggle.checked ? enableBg() : disableBg());

document.addEventListener("visibilitychange", () => {
  if (bgMode) {
    document.title = document.hidden ? "J.A.R.V.I.S ● BG-ACTIVE ●" : "J.A.R.V.I.S — BG MODE";
  } else {
    document.title = "J.A.R.V.I.S — Cyberpunk Assistant";
  }
});

// Background keepalive — page ko alive rakhne ki koshish (browser throttles, par fetch chalta rehta hai)
setInterval(() => {
  if (bgMode && document.hidden) {
    try { fetch("https://api.ipify.org?format=json").catch(() => {}); } catch (e) { /* noop */ }
  }
}, 45000);

/* ═══════════ LEARNING UI ═══════════ */

function syncLearnUI() {
  if (!window.LEARN) return;
  const s = window.LEARN.stats();
  if (learnStats) learnStats.textContent = s.lessons + " lesson" + (s.lessons === 1 ? "" : "s");
  if (learnToggle) learnToggle.checked = window.LEARN.enabled();
}

if (learnToggle) learnToggle.addEventListener("change", () => {
  if (window.LEARN) window.LEARN.setEnabled(learnToggle.checked);
  syncLearnUI();
});

if (forgetBtn) forgetBtn.addEventListener("click", () => {
  if (window.LEARN) { window.LEARN.wipe(); syncLearnUI(); }
});

/* ── Voice settings persist (ALWAYS LISTEN / WAKE WORD / language) — agle launch par yaad rehta hai ── */
const LS_VOICE = "jarvis_voice_v1";

function loadVoiceSettings() {
  const v = loadLS(LS_VOICE, {});
  if (alwaysListen && typeof v.always === "boolean") alwaysListen.checked = v.always;
  if (wakeToggle && typeof v.wake === "boolean") wakeToggle.checked = v.wake;
  if (v.lang && langSelect) {
    for (const o of langSelect.options) {
      if (o.value === v.lang) { langSelect.value = v.lang; break; }
    }
  }
  wakeMode = !!(wakeToggle && wakeToggle.checked);
}

function saveVoiceSettings() {
  saveLS(LS_VOICE, {
    always: !!(alwaysListen && alwaysListen.checked),
    wake: !!(wakeToggle && wakeToggle.checked),
    lang: langSelect ? langSelect.value : ""
  });
}

if (langSelect) langSelect.addEventListener("change", saveVoiceSettings);

if (alwaysListen) alwaysListen.addEventListener("change", () => {
  logLine(alwaysListen.checked
    ? "[VOICE] ALWAYS LISTEN ON — mic khula rahega, har baat ka intent analyze hoga"
    : "[VOICE] ALWAYS LISTEN OFF", alwaysListen.checked ? "ok" : "warn");
  saveVoiceSettings();
  ensureVoiceListening();
});

/* ═══════════ BOOT ═══════════ */

(function boot() {
  // Hacker atmosphere first
  initMatrix();
  runBoot();
  applyBgUI();
  syncLearnUI();
  syncSpotifyUI();
  loadKeys();
  // Spotify callback ke baad aaye? Flag check karo
  if (window.SPOTIFY) {
    const flag = window.SPOTIFY.consumeFlag();
    if (flag === "ok") logLine("[SPOTIFY] Connected ✓ — \"play <song> on spotify\" ya \"spotify search <song>\" try karo", "ok");
    else if (flag) logLine("[SPOTIFY] Connect issue: " + flag, "warn");
  }
  initClock();
  initCalendar();
  initWeather();
  initNetGraph();
  initMedia();
  initGauges();
  restoreChat();
  // Voice settings restore (ALWAYS LISTEN / WAKE WORD / language) — pehle saved state wapas
  loadVoiceSettings();
  if (wakeToggle) {
    wakeToggle.addEventListener("change", () => {
      wakeMode = wakeToggle.checked;
      logLine(wakeMode ? "[VOICE] WAKE WORD ON — \"Hey Jarvis\" bolo (Hindi mode mein bhi chalega)" : "[VOICE] WAKE WORD OFF", wakeMode ? "ok" : "warn");
      saveVoiceSettings();
      ensureVoiceListening();
    });
  }
  // ── Desktop par APNE AAP sunna: agar ALWAYS LISTEN / WAKE WORD enabled hai toh mic auto-start.
  // Chrome mic policy: pehli baar kisi click ke baad hi permission prompt aata hai — agar
  // permission pehle mil chuki hai (Allow), toh yeh seedha kaam karega. Nahin toh Settings mein
  // toggle OFF→ON karo (woh click permission mang sakta hai).
  if ((alwaysListen && alwaysListen.checked) || wakeMode) {
    setTimeout(() => {
      if (!isListening && !wakeTraining && ((alwaysListen && alwaysListen.checked) || wakeMode)) {
        micDenied = false;
        startListening(true);
        if (isListening) logLine("[VOICE] Auto-listening ON — JARVIS ab khud sunega (band karne ke liye mic dabao ya toggles off karo)", "ok");
      }
    }, 2200);
  }
  // ── Custom wake word: stored phrase/tokens load karo + settings wiring ──
  const storedWake = loadLS(LS_WAKE, null);
  if (storedWake && storedWake.phrase) {
    wakePhrase = normWakeText(String(storedWake.phrase).toLowerCase());
    wakeTokens = Array.isArray(storedWake.tokens) ? storedWake.tokens.map(String) : wakeWords(wakePhrase);
    if (wakeInput) wakeInput.value = wakePhrase;
    logLine("[WAKE] Custom wake word loaded: \"" + wakePhrase + "\"", "ok");
  }
  if (wakeSave) wakeSave.addEventListener("click", () => {
    const v = normWakeText((wakeInput.value || "").trim());
    if (!v) { setWakeStatus("Pehle wake word type karo, sir.", "err"); return; }
    if (v.split(/\s+/).length > 4 || v.length < 2) { setWakeStatus("1–4 words rakho, sir.", "err"); return; }
    wakePhrase = v.toLowerCase();
    wakeTokens = wakeWords(wakePhrase);
    saveLS(LS_WAKE, { phrase: wakePhrase, tokens: wakeTokens });
    logLine("[WAKE] Custom wake word set: \"" + wakePhrase + "\"", "ok");
    setWakeStatus("Saved ✓ — \"" + wakePhrase + "\"", "ok");
  });
  if (wakeTrain) wakeTrain.addEventListener("click", () => {
    if (wakeTraining) { // chalu training ko cancel karo
      const t = wakeTraining;
      wakeTraining = null;
      t.cancel();
      setWakeStatus("Training cancelled — \"Hey Jarvis\" abhi active.", "err");
      if (((alwaysListen && alwaysListen.checked) || wakeMode) && !micDenied) {
        setTimeout(() => { if (!isListening && !wakeTraining) startListening(true); }, 400);
      }
    } else {
      trainWakeWord();
    }
  });
  if (wakeReset) wakeReset.addEventListener("click", () => {
    wakePhrase = null; wakeTokens = [];
    try { localStorage.removeItem(LS_WAKE); } catch (e) { /* noop */ }
    if (wakeInput) wakeInput.value = "";
    logLine("[WAKE] Reset — \"Hey Jarvis\" wapas default", "warn");
    setWakeStatus("Reset — \"Hey Jarvis\" active", "ok");
  });
  setInterval(reminderCheck, 15000);
  logLine("System boot complete — all modules online", "ok");
  logLine("HUD live: clock / calendar / weather / gauges / network / media", "ok");
  logLine("Say \"what time is it\" ya \"open notepad\" ya toolkit chalao", "ok");

  // Voices load asynchronously in Chrome
  loadVoices();
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // First interaction hint — unlock speech + audio after a user gesture (autoplay policy)
  const unlock = () => {
    if ("speechSynthesis" in window && !firstInteract) {
      try { speechSynthesis.cancel(); } catch (e) { /* noop */ }
    }
    if (window.HACK) HACK.unlock();
  };
  window.addEventListener("pointerdown", unlock);

  if (window.HACK) HACK.setSound(soundToggle.checked);
})();
