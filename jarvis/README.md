# 🎬 J.A.R.V.I.S v2 — Cyberpunk Voice Assistant

Ek AI jo **bolti hai, sunti hai, aur hacking-style UI mein chalti hai** — bilkul cyberpunk films jaise.
No API key, no signup. **Python** se local server, ya bas double-click. 🚀

## 🚀 Chalane ka tareeka (sabse easy)

**`start.bat`** par double-click karo → Python server start hoga → JARVIS **standalone app window** mein khulega (browser tab nahi — asli desktop app jaisa!).

- Python installed nahi? Phir bhi kaam karega — bas Chrome mein `index.html` khol dega
- Server ka console window background mein (minimized) chalta hai — band karne ke liye taskbar se close karo

## 🖥️ Desktop shortcut (recommended)

1. `create_shortcut.vbs` par **double-click** karo (sirf ek baar)
2. Desktop par **`J.A.R.V.I.S`** shortcut ban jayega
3. Ab hamesha **desktop shortcut** se chalao — double-click aur app khul gaya! 🎉

> Shortcut JARVIS ko app-mode (no tabs, no address bar) mein kholta hai — jaise koi real desktop app.
> (VBS double-click pe `MsgBox` aayega — "Ho gaya!", wahan Yes dabao toh turant launch ho jayega.)

## 🧑‍💻 Ya phir manually

```
python server.py
```

Phir browser mein: `http://127.0.0.1:8000` (Spotify connect ke liye `127.0.0.1` zaroori — neeche Spotify section dekho)

## 🎨 Kya-kya hai isme (v3)

- 🖥️ **STARK HUD UI** — screenshot-style dense dashboard: live clock, calendar, CPU/MEM circular gauges, storage, uptime, **real weather** (AccuWeather — key lagao; nahi toh open-meteo fallback), network activity graph, **REAL media deck** (apni music files play karo — load/drag-drop, real FFT visualizer, OS media keys), scrolling system log
- ⚡ **REAL boot diagnostics** — startup par koi fake "[OK]" nahi: boot log mein asli checks (server link, mic, TTS, AI model, internet) apna real status dikhata hai
- 🎙️ **ALWAYS LISTEN mode** — toggle **ON karte hi** sunna shuru hota hai aur setting **yaad rehti hai**: agli baar app khulne par JARVIS **khud** sunta hai (pehli baar sirf mic "Allow" karna padta hai). Har baat ka **intent analyze** hota hai (order → execute, baat → reply) — SYSTEM LOG mein `[INTENT]` dikhta hai
- ⚡ **Commands turant execute** — "open notepad / calculator / cmd / chrome / paint" (server se real app kholta hai, whitelist), "shutdown pc / restart pc / lock pc" (25s delay + cancel), "open google", "what time is it"... bina extra baat ke
- 🗣️ **Wake word — "Hey Jarvis"** — ON karte hi sunna shuru; jab tak wake word nahi bologe kuch process nahi hota. **Hindi (Devanagari) mein bhi chalta hai** — Chrome Hindi STT "हे जार्विस" likhe toh bhi match ho jaata hai (Settings → WAKE WORD)
- 🎙️ **Custom wake word training** — Settings → **TRAIN** dabao aur apna wake word 3 baar bolo; JARVIS speech-to-text se seekhta hai ki aap kaise bolte ho ("ok computer" / "okay computer" — dono chalega). Text se bhi: `set wake word to ok computer` / `reset wake word`
- ⏰ **Productivity engine** — "remind me <baat> in <N> minutes" (notification + voice), "set timer <N> seconds" (beep), "note <text>" / "show notes", "search <query>", "play <song> on youtube", "joke", "fact"
- 📷 **Image vision** — composer mein 📷 button: image attach karo → chat mein thumbnail dikhegi → JARVIS (Gemini vision) usse dekh kar bataata hai kya hai. Caption ke saath bhi bhej sakte ho ("yeh kya hai?", "isse read karo"). Image 1024px tak auto-compress hoti hai; iske liye Gemini model + Google key chahiye (Settings → API Keys)
- 💾 **Chat memory** — last session restore hota hai (localStorage)
- 🧠 **Local LLM support** — apna Ollama model use karo (config.json mein `local_llm_url` + `local_llm_model`)
- 📊 **Real system metrics** — server chal raha ho toh REAL CPU/MEM/disk/uptime/network (psutil), warna honest "--" (fake data kabhi nahi)
- 🔒 **Learning from mistakes** — ✔/✘ feedback buttons, "yaad rakh …", local memory (localStorage)
- 🌙 **Background mode** — notifications + BG badge + Windows startup (install_startup.vbs)
- 🎙️ **Bolo** — mic button, Hindi / English / Hinglish samajhta hai (Listening language mein **Hindi (हिन्दी)** chuno — choice yaad rehti hai; Hindi bolne par jawab Hindi/Hinglish mein aata hai); 🔊 **Bol kar jawab** — Windows voices
- 🤖 **4 Personas** — Hinglish JARVIS, Classic English JARVIS, **GHOST-7 Hacker AI**, Spock
- 🛠️ **Zero setup** — no install, no API key (AI free hai — Pollinations.AI)

## 📁 Files

```
📁 jarvis/
 ├── index.html     → STARK HUD interface (widgets + chat + tools)
 ├── styles.css     → Cyan/teal HUD theme
 ├── app.js         → Voice + AI + widgets + intent analyzer + learning
 ├── tools.js       → 31 real security tools + arsenal + Spotify
 ├── learn.js       → Local memory learning (galtiyon se seekhna)
 ├── server.py      → Local Python server (system metrics + open apps + local LLM proxy)
 ├── start.bat      → Double-click launcher ⭐
 ├── create_shortcut.vbs → Desktop shortcut banata hai 🖥️
 ├── install_startup.vbs → Windows start par background auto-run 🌙
 └── README.md      → Yeh file 😄
```

## 💡 Tech behind the magic

| Kaam | Kaise |
|---|---|
| AI brain | [Pollinations.AI](https://text.pollinations.ai) — free, no-key |
| Sunna (STT) | Chrome Web Speech API (internet chahiye) |
| Bolna (TTS) | Chrome SpeechSynthesis + Windows voices (offline chalta hai) |
| Local server | Python 3 `http.server` — zero dependencies |
| UI | Pure HTML/CSS/JS + canvas matrix rain |

## 🔧 Troubleshooting

- **"Port 8000 busy"** → server.py automatically 8001-8004 try karta hai
- **Mic not working** → Chrome use karo, address bar mein mic icon → Allow
- **Koi jawab nahi** → Internet check karo
- **Voice nahi aa rahi** → Settings → "Speak replies aloud" on, ek baar koi message bhejo
- **Python nahi mila** → `start.bat` phir bhi file open kar dega; proper server ke liye [python.org](https://www.python.org/downloads/) se install karo ("Add to PATH" tick karna)
- **Desktop shortcut nahi bana** → `create_shortcut.vbs` double-click karo; agar koi warning aaye toh "Run" choose karo

## 🎵 Spotify integration (REAL — search, playlists, open in app)

JARVIS ab **aapke asli Spotify account** se jud sakta hai — no fake:

| Kaise | Kya hota hai |
|---|---|
| Settings → **Spotify** | Client ID paste karo → **CONNECT** → Spotify login → Allow. Bas, done! |
| `play <song> on spotify` | Top result **Spotify app mein khul jata hai** (free plan friendly) |
| `spotify search <song>` | Real search results (track + artist + album) + **open in spotify** link |
| `my playlists` / SPOTIFY tool | Aapke asli playlists (real `/me/playlists` API) |
| `connect spotify` / `disconnect spotify` / `spotify status` | Connect/logout/status control |

> ⚠️ **Naya Spotify rule (Nov 2025 se):** Spotify ab `localhost` ko redirect URI allow **nahi** karta — sirf **loopback IP** `127.0.0.1` HTTP ke saath chalta hai. Isliye app ab `http://127.0.0.1:8000` se khulti hai (start.bat khud yehi kholta hai).

### Setup (2 minute, 100% free)

1. [developer.spotify.com](https://developer.spotify.com) → **Dashboard** → **Create App** (koi card/API key nahi chahiye)
2. **Redirect URI** mein daalo: `http://127.0.0.1:8000/api/spotify/callback`
   - Port 8000 busy ho aur JARVIS 8001–8004 par chale, toh woh bhi add kar lena: `http://127.0.0.1:8001/api/spotify/callback`, … `8004` tak
3. **Client ID** copy karo (Client Secret ki zaroorat NAHI — PKCE flow hai, secret safe rehta hai)
4. JARVIS ko `http://127.0.0.1:8000` se kholo (start.bat khud khol deta hai) → Settings → Spotify → Client ID paste → **CONNECT** → Allow dabao

### ⚠️ Sach (free vs premium)
- **Free plan:** search + playlists + track/playlist ko **Spotify app mein kholna** — sab real, sab legal
- **Premium:** Player API (`/v1/me/player/*`) direct playback control ke liye hai — code ready hai, premium account detect hote hi unlock ho jayega
- Tokens sirf **aapke browser ke localStorage** mein rehte hain — kisi server par nahi (PKCE, koi secret share nahi)
- **Server se chalao** (`start.bat`) — `file://` se Spotify OAuth nahi chalega (redirect URI chahiye). Server ab **`http://127.0.0.1:8000`** par khulta hai — `localhost` se mat kholo (Spotify `localhost` redirect URI reject karta hai)

## 🎭 Bonus: GHOST-7 persona

Settings → Persona → **GHOST-7 — Hacker AI**. Ab JARVIS aapse "operator" bolkar cyber-slang mein baat karega. 😎

## 🌙 Background Mode (peeche chalta rehta hai)

- Topbar ka **BG** button dabao (ya Settings → Background mode) → JARVIS background mein chalta rahega
- Window peeche ho toh bhi: reply aane par **desktop notification** aati hai, tab title par `● BG-ACTIVE` badge dikhta hai
- **Windows start par auto-run:** `install_startup.vbs` par double-click karo → JARVIS boot hote hi **minimized background** mein chale gi (server console minimized)
  - Remove: `Win+R` → `shell:startup` → `J.A.R.V.I.S.lnk` delete karo
- ⚠️ Sach: browser background tabs ko throttle karta hai, isliye mic background mein reliable nahi — par chat/AI/notifications chalti hain

## 🎙️ Custom wake word — speech-to-text training

Default wake word **"Hey Jarvis"** ke alawa aap apna khud ka bana sakte ho:

| Kaise | Kya hota hai |
|---|---|
| Settings → **🎤 TRAIN** | Mic khulta hai — apna wake word **3 baar bolo** (har sample ke baad beep). JARVIS saare samples se common words nikalta hai aur unhe yaad rakhta hai (localStorage)
| **TRAIN** ke baad wake mode | "ok computer", "okay computer", "okay computer open notepad" — sab trigger hota hai (variant-tolerant token matching)
| Text se | `set wake word to ok computer` — turant set. `reset wake word` — "Hey Jarvis" wapas
| Settings → SAVE | Seedha type karke bhi save kar sakte ho (1–4 words)
| RESET | Custom wake word hata kar default "Hey Jarvis" restore

**Sach:** yeh **speech-to-text (transcript) matching** hai — audio fingerprint/model training nahi (browser uski permission nahi deta). JARVIS sirf yaad rakhta hai ki aap wake word **kis tarah bolte ho** (words + variants), aur transcript mein wahi pattern dikhne par activate hota hai. Isliye thoda shor/misheard ho toh "jarvis" ya dobara bolo — aur "Hey Jarvis" hamesha backup rehta hai.

## 🧠 Learning — galtiyon se seekhna

JARVIS apni galtiyon se seekhta hai (local memory, localStorage mein):

| Kaise | Kya hota hai |
|---|---|
| Reply par **✘ GALAT** button | Chhota input aata hai → sahi jawab type karo → lesson save |
| Reply par **✔ SAHI** | Positive note |
| Bolo: `yaad rakh <baat>` | Baat lesson ban jaati hai (e.g. "yaad rakh mujhe coffee pasand hai") |
| Bolo: `kya seekha` | Saare lessons ki list |
| Bolo: `forget` / Settings → FORGET ALL | Memory wipe |
| AI error aaye | Error log hota hai — same model baar-baar fail ho toh JARVIS khud bataata hai "N failures ho chuke — model badlo" |

Jab bhi related baat aati hai, lessons system-prompt mein inject hote hain → replies improve hoti hain. Settings → **Learn from mistakes** toggle se on/off. ⚠️ Sach: yeh **retrieval-based memory** hai (pattern recall) — real ML training nahi, aur sab data sirf aapke browser mein rehta hai, kisi server par nahi.

## 🧠 DeepSeek API (deepseek-v4-flash) — use karna

JARVIS ab **real DeepSeek models** bhi use kar sakta hai: `deepseek-v4-flash` aur `deepseek-v4-pro`.

### Setup (1 baar, 2 minute)

1. **API key banao**: [platform.deepseek.com](https://platform.deepseek.com) → sign up → **API Keys** → Create → copy `sk-...`
   - ⚠️ DeepSeek **paid** hai (pay-as-you-go). API use karte waqt thoda balance chahiye hota hai
2. `config.json` kholo aur key daalo:
   ```json
   { "deepseek_api_key": "sk-APKI_ASLI_KEY_YAHAN_DAALO" }
   ```
3. `start.bat` se app chalao (DeepSeek ko **server chahiye** — file:// se nahi chalega)
4. Settings → AI Model → **deepseek-v4-flash** select karo → baat karo! 🎉

### 🔐 Security
- API key **sirf server-side** rehta hai (`server.py` ka `/api/chat` proxy)
- Browser kabhi key nahi dekhta — koi bhi `fetch` request browser se nahi jaati DeepSeek tak
- `config.json` ko static serving se block kar diya hai (server 403 deta hai)

### 🤔 Agar kaam na kare
- "DeepSeek issue" error → key check karo, server chal raha hai na?
- Free chahiye? Settings mein **openai (Pollinations)** — no key, hamesha free

## 🌦️ AccuWeather (sahi weather — server-side key)

Weather ab **AccuWeather** se aata hai — AccuWeather ka data kaafi accurate maana jaata hai (real stations + hi-res models).

| Kaise | Kya hota hai |
|---|---|
| Key daali ho + server chale | HUD weather + `weather` command = **AccuWeather** data (current + 5-day, icon, shahar) |
| Key nahi / server band | Honest fallback: pehle wala **open-meteo** (free, no-key) |
| Tag dekho | Widget ke corner par `ACCUWEATHER` (AccuWeather live) / `LIVE` (open-meteo) / `OFFLINE` |

### Setup (2 minute, 100% free trial)

1. [developer.accuweather.com](https://developer.accuweather.com) → **Create Account** (free)
2. Dashboard/Subscriptions se apna **API key** copy karo (ek app bana ke)
3. `config.json` kholo aur `accuweather_api_key` ki value mein key daalo (baaki keys hatao mat — sirf edit karo):
   ```json
   { "deepseek_api_key": "...", "accuweather_api_key": "YAHAN_APNI_KEY_DAALO" }
   ```
   (ya `ACCUWEATHER_API_KEY` env var set karo)
4. `start.bat` se app chalao — weather widget ab **ACCUWEATHER** tag ke saath live hoga 🎉

### ⚠️ Sach (free vs limits)
- **Core Weather free trial** = ~500 calls/day (14 din); purane/limit par 50/day bhi milta hai — isliye server **10-min cache** rakhta hai (1 shahar = ~6 calls/hr, ek din mein 150 bhi nahi)
- **Key sirf server-side** rehta hai (`server.py` ka `/api/weather` proxy) — browser kabhi key nahi dekhta, config.json 403 se block hai
- AccuWeather API browser se direct CORS support nahi karta — isliye local server se proxy karna padta hai (`start.bat`)
- Key lagana zaroori nahi — bina key ke app phir bhi open-meteo se kaam karta hai

## 🛠️ Security Toolkit (30 REAL tools, legal)

Koi fake animation nahi — yeh sab **real** security tools hain jo aapke apne data aur public services par kaam karte hain (Linux tools ke browser-friendly equivalents):

### 🕵️ RECON (network / public data)

| Tool | Bol/Type karo | Kya hai (real!) | Linux equivalent |
|---|---|---|---|
| DNS LOOKUP | `dns lookup <host>` | Real DNS A/AAAA/MX records — Cloudflare DoH | `dig` / `nslookup` |
| WHOIS | `whois <domain>` | Real domain registry data — ICANN RDAP | `whois` |
| SUBDOMAIN | `subdomain <domain>` | Real subdomain enum — certificate transparency logs (crt.sh) | `theHarvester` / `dnsrecon` |
| PORTSCAN | `port scan <host>` | Real TCP port checks — check-host.net nodes (⚠️ sirf authorized) | `nmap` |
| TRACEROUTE | `traceroute <host>` | Real hop-by-hop route — public nodes | `traceroute` / `tracert` |
| PING | `ping <host>` | Real ICMP echo — host up/down | `ping` |
| CERT | `cert <domain>` | Real SSL certificate info — transparency logs | `sslscan` / `openssl s_client` |
| REV DNS | `reverse dns <ip>` | Real PTR record — Cloudflare DoH | `dig -x` |
| HTTP PROBE | `http probe <url>` | Real security-header check (A–F grade) | `curl -I` / securityheaders.com |

### 🔐 CRYPTO (fully local)

| Tool | Bol/Type karo | Kya hai (real!) | Linux equivalent |
|---|---|---|---|
| HASH | `hash <text>` | Real SHA-256/512 — WebCrypto (local) | `sha256sum` |
| CRYPTO | `crypto <msg>` | Real AES-256-GCM encrypt/decrypt (key aapke paas) | `openssl enc` |
| BASE64 | `base64 <text>` | Real base64 encode/decode (local) | `base64` |
| HEX | `hex <text>` | Real hex encode/decode (local) | `xxd` / `hexdump` |
| ROT | `rot13 <text>` | Classic ROT/Caesar cipher (local) | `tr` / `rot13` |
| URL | `url <text>` | URL encode/decode (local) | `python -m urllib` |
| HASHID | `hashid <hash>` | Real hash-type detection (hashID style) | `hashid` / `hashcat --identify` |
| PASSWORD | `password` | Real entropy strength check + CSPRNG generator | `openssl rand` / `pwgen` |

### 🌐 NET (networking math)

| Tool | Bol/Type karo | Kya hai (real!) | Linux equivalent |
|---|---|---|---|
| SUBNET | `subnet <cidr>` | Real CIDR calculator — network/broadcast/hosts | `ipcalc` |
| PORTS | `ports <svc>` | Well-known ports database (IANA) | `/etc/services` |
| MAC | `mac <mac>` | MAC vendor (OUI) lookup + random MAC generator | `macchanger` |
| MY IP | `my ip` | Aapka public IP (ipify) | `curl ifconfig.me` |

### 🕶️ OSINT (public data)

| Tool | Bol/Type karo | Kya hai (real!) | Linux equivalent |
|---|---|---|---|
| GEOIP | `geoip <ip>` | IP location/ISP — ipwho.is | `geoiplookup` |
| GITHUB | `github <user>` | Public GitHub profile OSINT | `curl api.github.com` |
| NEWS | `news` | Real top headlines — Google News RSS | `curl news.google.com/rss` |
| WIKI | `wiki <topic>` | Real Wikipedia search + intro — public API | `curl en.wikipedia.org` |
| SYSTEM RECON | `system recon` | Aapki apni machine ka fingerprint (browser APIs) | `uname -a` / `neofetch` |
| ARSENAL | `arsenal` | 39 Kali/Linux tools ka searchable reference catalog | man pages / kali docs |

### 🛡️ PRIVACY (sab real)

| Tool | Bol/Type karo | Kya hai (real!) | Linux equivalent |
|---|---|---|---|
| LEAK TEST | `leak test` | REAL WebRTC local-IP leak check + location permission status + public IP | `dnsleaktest.com` / WebRTC tests |
| VPN CHECK | `vpn` / `am i on a vpn` | REAL VPN/proxy check — aapka asli public IP (ipify), real ISP/ASN/location (ipwho.is), real WebRTC candidates, real browser connection API. Honest pattern analysis — koi fake number nahi | `ipinfo.io` / ASN lookup |
| VPN GUIDE | `vpn guide` | REAL setup guide: Proton VPN (free, no-logs), Mullvad (€5 flat), Tor Browser | — |

> ⚠️ **Seedha sach:** Browser ke andar asli VPN chalti hi nahi (OS-level access chahiye), aur browser se VPN 100% confirm bhi nahi hota. Isliye **VPN CHECK** aapke **real data** (IP, ISP, ASN, WebRTC, connection) par honest estimate deta hai — koi simulation, koi fake number nahi. Asli privacy ke liye `vpn guide` se real VPN install karo, phir `leak test` + `vpn check` se verify karo.

**Verify karo:** HASH tool mein `hello world` daalo — SHA-256 hamesha `b94d27b9…cde9` aana chahiye. CRYPTO se encrypt karke dobara decrypt karo — wahi message wapas milega. Sab kuch local ya public-data APIs se — koi remote attack nahi. ⚠️ PORTSCAN sirf apne ya authorized systems par (TryHackMe/HackTheBox labs, ya `scanme.nmap.org`).

## ⚖️ Legal baat (seedha)

Real **network attack** tools (kisi aur ke system ko scan/crack/DoS karna) main nahi bana sakta — yeh crime hai (India IT Act Sec 66, etc.) aur browser raw TCP sockets khol hi nahi sakta. Lekin **legal hacking seekhna** hai toh yeh practice platforms use karo (apne hi target machines):

- [TryHackMe](https://tryhackme.com) — beginner friendly
- [HackTheBox](https://hackthebox.com) — labs
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) — free web hacking labs
- [pwn.college](https://pwn.college) — exploit development
- [OverTheWire](https://overthewire.org) — wargames

Settings mein **Terminal sounds** toggle bhi hai — retro beeps ke liye (WebAudio, koi file nahi). 🔊

Enjoy, operator! 🔓
