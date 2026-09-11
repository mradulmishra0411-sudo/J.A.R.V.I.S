#!/usr/bin/env python3
"""
J.A.R.V.I.S v2 — Local server
Zero dependencies: sirf Python 3 (jo aapke system par hai) chahiye.
Serve karta hai is folder ko aur browser automatically khol deta hai.

Chalao:  python server.py        (ya bas start.bat par double-click)
"""

import http.server
import json
import os
import shutil
import socket
import socketserver
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

PORT_START = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(DIRECTORY, "config.json")
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"
ACCUWEATHER_URL = "https://dataservice.accuweather.com"
_WEATHER_CACHE = {}   # lat,lon → {ts, data} — AccuWeather free-tier calls bachane ke liye
WEATHER_CACHE_TTL = 600  # 10 min
_BOOT_TS = time.time()

OPEN_APPS = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "terminal": "cmd.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "chrome": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "spotify": "spotify",
}


def get_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def get_system_info():
    """Real system metrics (psutil ho toh) — warna sirf real stdlib data (disk/uptime).
    Fake CPU/MEM values kabhi nahi — psutil nahi hai toh cpu/mem None rehte hain, UI '--' dikhata hai."""
    info = {"simulated": False, "ts": time.time()}
    try:
        import psutil
        info["cpu"] = int(psutil.cpu_percent(interval=None) or 0)
        info["mem"] = int(psutil.virtual_memory().percent)
        du = psutil.disk_usage(DIRECTORY)
        info["disk_total"] = du.total
        info["disk_free"] = du.free
        info["uptime"] = int(time.time() - psutil.boot_time())
        ni = psutil.net_io_counters()
        info["net"] = {"sent": ni.bytes_sent, "recv": ni.bytes_recv}
    except Exception:
        info["simulated"] = True
        info["cpu"] = None
        info["mem"] = None
        du = shutil.disk_usage(DIRECTORY)
        info["disk_total"] = du.total
        info["disk_free"] = du.free
        info["uptime"] = int(time.time() - _BOOT_TS)
    try:
        info["hostname"] = os.environ.get("COMPUTERNAME") or socket.gethostname()
    except Exception:
        info["hostname"] = "JARVIS-NODE"
    return info


def open_app(action):
    """Whitelisted apps only — kabhi arbitrary command nahi."""
    a = (action or "").lower()
    # ── system actions (sirf in whitelisted actions; 25s delay + cancel possible) ──
    if a in ("shutdown", "restart"):
        flag = "/s" if a == "shutdown" else "/r"
        subprocess.Popen(["shutdown", flag, "/t", "25", "/c", "JARVIS requested"])
        return True, a + " (25s)"
    if a == "lock":
        subprocess.Popen(["rundll32.exe", "user32.dll,LockWorkStation"])
        return True, a
    if a == "cancel_shutdown":
        subprocess.Popen(["shutdown", "/a"])
        return True, a
    if a not in OPEN_APPS:
        return False, "unknown_app"
    target = OPEN_APPS[a]
    try:
        if a == "spotify":
            subprocess.Popen(["cmd", "/c", "start", "spotify:"], shell=False)
        elif a == "chrome":
            if os.path.exists(target):
                subprocess.Popen([target])
            else:
                return False, "chrome_not_found"
        else:
            try:
                os.startfile(target)
            except Exception:
                subprocess.Popen([target])
        return True, a
    except Exception as e:
        return False, str(e)


def get_deepseek_key():
    """API key config.json se ya DEEPSEEK_API_KEY env var se. Browser kabhi nahi dekhta."""
    key = (os.environ.get("DEEPSEEK_API_KEY") or "").strip()
    if not key:
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            key = (cfg.get("deepseek_api_key") or "").strip()
        except Exception:
            key = ""
    return key


def get_google_key():
    """Google/Gemini API key config.json se ya GOOGLE_API_KEY env var se. Browser kabhi nahi dekhta."""
    key = (os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            key = (cfg.get("google_api_key") or "").strip()
        except Exception:
            key = ""
    return key


def get_accuweather_key():
    """API key config.json se ya ACCUWEATHER_API_KEY env var se. Browser kabhi nahi dekhta."""
    key = (os.environ.get("ACCUWEATHER_API_KEY") or "").strip()
    if not key:
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            key = (cfg.get("accuweather_api_key") or "").strip()
        except Exception:
            key = ""
    return key


class AccuWeatherError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def accuweather_get(key, path, params):
    """AccuWeather REST call — apikey query param mein, key kabhi browser tak nahi jaata."""
    params = dict(params or {})
    params["apikey"] = key
    url = ACCUWEATHER_URL + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "JARVIS/2.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_accuweather_weather(lat, lon):
    """AccuWeather se normalized weather: geo → locationKey → current + 5-day forecast.
    Free-tier calls limited hain isliye 10-min cache. Error → AccuWeatherError
    (browser phir open-meteo par honest fallback karta hai — fake data kabhi nahi)."""
    key = get_accuweather_key()
    if not key:
        raise AccuWeatherError("no_key", "config.json mein 'accuweather_api_key' daalo ya ACCUWEATHER_API_KEY env var set karo.")
    cache_key = "%.4f,%.4f" % (float(lat), float(lon))
    now = time.time()
    hit = _WEATHER_CACHE.get(cache_key)
    if hit and now - hit["ts"] < WEATHER_CACHE_TTL:
        return hit["data"]

    loc = accuweather_get(key, "/locations/v1/cities/geoposition/search", {"q": cache_key, "language": "en-us"})
    loc_key = loc.get("Key") if isinstance(loc, dict) else None
    if not loc_key:
        raise AccuWeatherError("no_location", "AccuWeather location nahi mili — coordinates check karo.")

    city = ", ".join(x for x in [loc.get("LocalizedName"), (loc.get("Country") or {}).get("ID")] if x)
    cur = accuweather_get(key, "/currentconditions/v1/%s" % loc_key, {"language": "en-us"})
    fc = accuweather_get(key, "/forecasts/v1/daily/5day/%s" % loc_key, {"language": "en-us", "metric": "true"})

    c = cur[0] if isinstance(cur, list) and cur else {}
    temp_c = (c.get("Temperature") or {}).get("Metric") or {}
    temp_val = temp_c.get("Value")

    daily = []
    for d in (fc.get("DailyForecasts") or [])[:5]:
        t = d.get("Temperature") or {}
        day = d.get("Day") or {}
        daily.append({
            "date": (d.get("Date") or "")[:10],
            "max": int(round((t.get("Maximum") or {}).get("Value") or 0)),
            "min": int(round((t.get("Minimum") or {}).get("Value") or 0)),
            "icon": day.get("Icon"),
            "phrase": day.get("IconPhrase") or "",
        })

    data = {
        "provider": "accuweather",
        "locationKey": loc_key,
        "city": city,
        "temp": int(round(temp_val)) if temp_val is not None else None,
        "desc": c.get("WeatherText") or "",
        "icon": c.get("WeatherIcon"),
        "daily": daily,
    }
    _WEATHER_CACHE[cache_key] = {"ts": now, "data": data}
    return data


BANNER = r"""
  ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
  ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
  ██║███████║██████╔╝██║   ██║██║███████╗
  ╚██╗██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║
   ╚██║██║  ██║██║  ██║ ╚████╔╝ ██║███████║
    ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serve files from this folder + /api/chat proxy (DeepSeek key server-side)."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        """Har response par no-cache — browser purani app.js/index.html kabhi cache na kare
        (server restart ke baad nayi files hamesha fresh load hon)."""
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write("  [REQ] %s %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()

    # ── security: config.json / .env kabhi serve nahi honge ──
    def do_GET(self):
        low = self.path.lower()
        if "config.json" in low or ".env" in low or "server.py" in low:
            self.send_error(403, "Forbidden")
            return
        if self.path.rstrip("/") == "/api/system":
            self.reply_json(get_system_info())
            return
        if self.path.rstrip("/") == "/api/keys":
            self.handle_keys_get()
            return
        if self.path.startswith("/api/weather"):
            self.handle_weather()
            return
        if self.path.startswith("/api/spotify/callback"):
            self.serve_spotify_callback()
            return
        super().do_GET()

    def serve_spotify_callback(self):
        """Spotify OAuth PKCE callback — token exchange browser mein hota hai (spotify.js),
        yeh sirf ek mini-page serve karta hai jo usse call karke app par wapas redirect karta hai."""
        html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>J.A.R.V.I.S — Spotify callback</title>
<style>body{background:#02050a;color:#00e5ff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center;letter-spacing:2px}</style>
</head>
<body><div>SPOTIFY AUTH — CONNECTING…</div>
<script src="/spotify.js"></script>
<script>
(function(){
  try {
    var p = new URLSearchParams(window.location.search);
    var code = p.get("code");
    var state = p.get("state");
    if (code && state && window.SPOTIFY) {
      window.SPOTIFY.handleCallback(code, state).then(function(){
        window.location.replace("/");
      }).catch(function(){ window.location.replace("/"); });
    } else {
      window.location.replace("/");
    }
  } catch (e) {
    window.location.replace("/");
  }
})();
</script>
</body>
</html>"""
        payload = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_weather(self):
        """GET /api/weather?lat=28.6&lon=77.2 → AccuWeather (key server-side, 10-min cache).
        Key nahi / server-side error ho toh browser open-meteo par fallback karta hai (honest — fake kabhi nahi)."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            lat = (q.get("lat") or [""])[0]
            lon = (q.get("lon") or [""])[0]
            try:
                float(lat)
                float(lon)
            except ValueError:
                self.reply_json({"error": "bad_coords",
                                 "message": "lat/lon chahiye — e.g. /api/weather?lat=28.6&lon=77.2"}, 400)
                return
            self.reply_json(fetch_accuweather_weather(lat, lon))
        except AccuWeatherError as e:
            self.reply_json({"error": e.code, "message": str(e)}, 400)
        except Exception as e:
            self.reply_json({"error": "accuweather_unavailable", "message": str(e)}, 502)

    def do_POST(self):
        path = self.path.rstrip("/")
        if path == "/api/chat":
            self.handle_chat()
        elif path == "/api/chat-gemini":
            self.handle_chat_gemini()
        elif path == "/api/chat-local":
            self.handle_chat_local()
        elif path == "/api/open":
            self.handle_open()
        elif path == "/api/keys":
            self.handle_keys()
        else:
            self.send_error(404, "Not Found")

    def _local_origin_ok(self):
        """Sirf localhost pages se requests — DNS-rebinding/malicious page se bachao.
        file:// pages Origin: 'null' bhejte hain — unhe GET sab allowed hai (weather/system/keys-masked)
        aur chat proxies (AI calls — server-side keys, file-mode mein bhi Gemini/DeepSeek chalega).
        /api/open (PC control) aur /api/keys write sirf real localhost pages se — protected rehte hain."""
        origin = self.headers.get("Origin") or ""
        if origin:
            if origin == "null":
                # file:// pages — GET sab allowed (weather/system/keys-masked), aur chat proxies
                # (AI calls server-side keys use karte hain — file-mode mein bhi Gemini/DeepSeek chale).
                # /api/open (PC control) aur /api/keys write protected rehte hain.
                if self.command != "GET":
                    p = self.path.split("?", 1)[0].rstrip("/")
                    if p not in ("/api/chat", "/api/chat-gemini", "/api/chat-local"):
                        return False
            elif not (origin.startswith("http://localhost") or origin.startswith("http://127.0.0.1")):
                return False
        host = (self.headers.get("Host") or "").lower()
        if host and not (host.startswith("localhost") or host.startswith("127.0.0.1")):
            return False
        return True

    def _cors_headers(self):
        """CORS headers — file:// pages aur Chrome Private Network Access ke liye."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        """CORS preflight (file:// pages + Chrome Private Network Access)."""
        self.send_response(204)
        self._cors_headers()
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def handle_open(self):
        """Whitelisted app open karo (notepad, calc, cmd...). Browser se sirf whitelist hi reachable."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            ok, result = open_app(body.get("action", ""))
            if not ok and result == "unknown_app":
                self.reply_json({"error": "unknown_app"}, 400)
                return
            if not ok:
                self.reply_json({"error": "open_failed", "detail": result}, 500)
                return
            self.reply_json({"ok": True, "action": result})
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)

    def handle_keys_get(self):
        """GET /api/keys — return masked keys (last 4 chars visible) so UI can show placeholders."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            cfg = get_config()
            def mask(k):
                k = (k or "").strip()
                if not k: return ""
                return "*" * max(0, len(k) - 4) + k[-4:]
            self.reply_json({
                "google_api_key_masked": mask(cfg.get("google_api_key")),
                "deepseek_api_key_masked": mask(cfg.get("deepseek_api_key")),
            })
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)

    def handle_keys(self):
        """POST /api/keys — save API keys to config.json. Browser kabhi keys nahi dekhta."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(body, dict):
                self.reply_json({"error": "bad_body"}, 400)
                return
            cfg = get_config()
            updated = []
            for key in ("google_api_key", "deepseek_api_key"):
                val = (body.get(key) or "").strip()
                if val:  # sirf non-empty values save karo
                    cfg[key] = val
                    updated.append(key)
                elif key in body and body[key] == "":
                    # explicitly empty = clear the key
                    cfg[key] = ""
                    updated.append(key)
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(cfg, f, indent=2, ensure_ascii=False)
            self.reply_json({"ok": True, "updated": updated})
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)

    def handle_chat_local(self):
        """Local LLM proxy (Ollama ya OpenAI-compatible). config.json: local_llm_url + local_llm_model."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            cfg = get_config()
            url = (cfg.get("local_llm_url") or os.environ.get("LOCAL_LLM_URL") or "").strip()
            if not url:
                self.reply_json({"error": "local_llm_not_configured",
                                 "message": "config.json mein local_llm_url daalo (e.g. \"http://localhost:11434/v1\" Ollama ke liye)."}, 400)
                return
            if not url.rstrip("/").endswith("/chat/completions"):
                url = url.rstrip("/") + "/chat/completions"
            model = cfg.get("local_llm_model") or os.environ.get("LOCAL_LLM_MODEL") or "llama3"
            payload = {
                "model": model,
                "messages": body.get("messages") or [],
                "temperature": body.get("temperature", 0.85),
                "max_tokens": body.get("max_tokens", 450),
                "stream": False,
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = data["choices"][0]["message"]["content"]
            self.reply_json({"text": text})
        except urllib.error.HTTPError as e:
            self.reply_json({"error": "local_llm_http", "status": e.code, "detail": e.read().decode("utf-8", errors="replace")[:200]}, 502)
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)

    def reply_json(self, obj, code=200):
        payload = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_chat(self):
        """Browser → localhost/api/chat → DeepSeek (key yahan hai, browser ke paas nahi)."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(body, dict):
                self.reply_json({"error": "bad_body"}, 400)
                return
            key = get_deepseek_key()
            if not key:
                self.reply_json({"error": "no_key",
                                 "message": "DeepSeek API key nahi mili. config.json mein 'deepseek_api_key' daalo ya DEEPSEEK_API_KEY env var set karo."}, 400)
                return
            messages = body.get("messages") or []
            if not messages:
                self.reply_json({"error": "empty_messages"}, 400)
                return
            payload = {
                "model": body.get("model") or "deepseek-v4-flash",
                "messages": messages,
                "temperature": body.get("temperature", 0.85),
                "max_tokens": body.get("max_tokens", 450),
                "stream": False,
            }
            req = urllib.request.Request(
                DEEPSEEK_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + key,
                },
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            text = data["choices"][0]["message"]["content"]
            self.reply_json({"text": text})
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:300]
            self.reply_json({"error": "deepseek_http", "status": e.code, "detail": detail}, 502)
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)

    def handle_chat_gemini(self):
        """Browser → localhost/api/chat-gemini → Google Gemini (key yahan hai, browser ke paas nahi).
        OpenAI-compatible format convert karta hai → Gemini generateContent format."""
        try:
            if not self._local_origin_ok():
                self.reply_json({"error": "forbidden_origin"}, 403)
                return
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(body, dict):
                self.reply_json({"error": "bad_body"}, 400)
                return
            key = get_google_key()
            if not key:
                self.reply_json({"error": "no_key",
                                 "message": "Google/Gemini API key nahi mili. config.json mein 'google_api_key' daalo ya GOOGLE_API_KEY env var set karo."}, 400)
                return
            messages = body.get("messages") or []
            if not messages:
                self.reply_json({"error": "empty_messages"}, 400)
                return

            # Gemini model — client bhejega "gemini-2.5-flash" jaise
            gemini_model = body.get("model") or "gemini-2.5-flash"
            # Gemini generateContent endpoint:
            # POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}

            # System prompt nikalo (pehla system message)
            system_text = ""
            contents = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                img = msg.get("image")
                if role == "system":
                    system_text = content
                elif role == "assistant":
                    contents.append({"role": "model", "parts": [{"text": content}]})
                else:
                    # Vision support: client "image" field bhejta hai (base64 data + mime)
                    parts = []
                    if isinstance(img, dict) and img.get("data"):
                        parts.append({
                            "inline_data": {
                                "mime_type": img.get("mime") or "image/jpeg",
                                "data": img.get("data"),
                            }
                        })
                    if content:
                        parts.append({"text": content})
                    contents.append({"role": "user", "parts": parts})

            # Gemini requires user/model alternation; merge consecutive same-role messages
            # (sirf pure-text messages merge hoti hain — image wali parts preserve hoti hain)
            def _text_only(parts):
                return len(parts) == 1 and "text" in parts[0]

            merged = []
            for c in contents:
                if merged and merged[-1]["role"] == c["role"] \
                        and _text_only(merged[-1]["parts"]) and _text_only(c["parts"]):
                    merged[-1]["parts"][0]["text"] += "\n" + c["parts"][0]["text"]
                else:
                    merged.append(c)
            contents = merged

            # Ensure first message is from user (Gemini requirement)
            if not contents or contents[0]["role"] != "user":
                contents.insert(0, {"role": "user", "parts": [{"text": "."}]})

            # Build Gemini payload
            payload = {"contents": contents}
            if system_text:
                payload["systemInstruction"] = {"parts": [{"text": system_text}]}
            payload["generationConfig"] = {
                "temperature": body.get("temperature", 0.85),
                "maxOutputTokens": body.get("max_tokens", 450),
            }

            api_url = "%s/%s:generateContent?key=%s" % (GEMINI_URL, gemini_model, key)
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            # Extract text from Gemini response
            text = ""
            candidates = data.get("candidates") or []
            if candidates:
                parts = candidates[0].get("content", {}).get("parts") or []
                text = "".join(p.get("text", "") for p in parts)
            if not text.strip():
                raise Exception("Gemini ne khali response diya")
            self.reply_json({"text": text.strip()})
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:500]
            self.reply_json({"error": "gemini_http", "status": e.code, "detail": detail}, 502)
        except Exception as e:
            self.reply_json({"error": "server", "message": str(e)}, 500)


def main():
    print("\033[32m" + BANNER + "\033[0m")
    print("\033[36m  Cyberpunk Assistant — local uplink\033[0m\n")

    try:
        import psutil  # noqa: F401
    except ImportError:
        print("\033[33m  [!] psutil nahi mila — CPU/MEM HUD '--' dikhayega (honest, fake nahi).\033[0m")
        print("\033[33m      Full live gauges ke liye: pip install psutil\033[0m\n")

    # Try a few ports in case 8000 is busy — bind once and reuse
    httpd = None
    for candidate in range(PORT_START, PORT_START + 5):
        try:
            httpd = socketserver.TCPServer(("", candidate), Handler)
            httpd.allow_reuse_address = True  # quick restart ke liye
            port = candidate
            break
        except OSError:
            continue

    if httpd is None:
        print("\033[31m  [ERR] Ports 8000-8004 busy. Close kuch aur program aur retry karo.\033[0m")
        sys.exit(1)

    # 127.0.0.1 use karo, localhost NAHI — Spotify (Nov 2025 se) "localhost" ko
    # redirect URI allow nahi karta; loopback IP literal (127.0.0.1) HTTP ke saath chalta hai.
    url = "http://127.0.0.1:%d" % port
    print("  \033[32m[OK]\033[0m Server running on  \033[1;32m%s\033[0m" % url)
    print("  \033[90m     Ctrl+C dabao to stop. App window khud khulega...\033[0m\n")

    # Chrome ko standalone app-window mode mein kholo (no tabs, no address bar — desktop app jaisa)
    opened = False
    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for c in chrome_candidates:
        if os.path.exists(c):
            try:
                subprocess.Popen([c, "--app=" + url, "--window-size=1280,820"])
                opened = True
                break
            except OSError:
                pass
    if not opened:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        with httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  \033[33m[!]\033[0m Uplink terminated. Goodbye, operator.\n")


if __name__ == "__main__":
    main()
