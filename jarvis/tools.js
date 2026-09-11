/* ═══════════════════════════════════════════════════════
   J.A.R.V.I.S v2 — SECURITY TOOLKIT (REAL TOOLS)
   Sab tools REAL hain aur legal:
   - Local: WebCrypto (SHA / AES-GCM), encodings, ciphers, CIDR math,
     port database, hash-ID detection, MAC generator
   - Public data APIs: Cloudflare DoH (DNS), crt.sh (cert transparency),
     RDAP (WHOIS), ipwho.is / ipify (IP info), GitHub API (public profiles),
     check-host.net (ping / traceroute / port check), macvendors (OUI)
   Koi remote "attack" tool nahi. Port scan sirf authorized targets ke
   warnings ke saath. 🛡️
   ═══════════════════════════════════════════════════════ */
"use strict";

window.HACK = (function () {

  /* ─── refs ─── */
  const modal     = document.getElementById("hackModal");
  const titleEl   = document.getElementById("hackTitle");
  const output    = document.getElementById("hackOutput");
  const inputRow  = document.getElementById("hackInputRow");
  const inputEl   = document.getElementById("hackInput");
  const goBtn     = document.getElementById("hackGo");
  const closeBtn  = document.getElementById("hackClose");
  const badgeEl   = document.getElementById("hackBadge");
  const searchEl  = document.getElementById("toolSearch");

  /* ─── state ─── */
  let runToken = 0;      // increment to cancel a running module
  let currentId = null;  // currently open tool id
  let soundOn = true;
  let actx = null;

  /* ─── helpers ─── */
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const PROXY = "https://api.allorigins.win/get?url=";

  function line(cls, text) {
    const d = document.createElement("div");
    if (cls) d.className = "hack-line " + cls;
    if (text !== undefined) d.textContent = text;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
    return d;
  }

  /* ─── CORS-safe public API fetch (through the same proxy the app already uses) ─── */
  async function proxyGet(url) {
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error("proxy HTTP " + res.status);
    const data = await res.json();
    if (!data || typeof data.contents !== "string" || !data.contents.trim()) throw new Error("empty response");
    return data.contents;
  }

  /* ─── retro terminal sound (WebAudio — no assets) ─── */
  function unlock() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* noop */ }
    }
    if (actx && actx.state === "suspended") { try { actx.resume(); } catch (e) { /* noop */ } }
  }

  function beep(freq, dur, type, vol) {
    if (!soundOn || !actx) return;
    try {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || "square";
      o.frequency.value = freq || 880;
      g.gain.setValueAtTime(vol || 0.05, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.04));
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + (dur || 0.04));
    } catch (e) { /* noop */ }
  }
  const tick    = () => beep(900, 0.02, "square", 0.03);
  const success = () => { beep(660, 0.08, "sine", 0.06); setTimeout(() => beep(990, 0.1, "sine", 0.06), 90); };
  const buzz    = () => beep(160, 0.2, "sawtooth", 0.06);

  /* ─── modal control ─── */
  function closeModal() {
    runToken++;            // cancel running module
    currentId = null;
    modal.classList.remove("open");
  }

  function launch(id, param) {
    const t = TOOLS[id];
    if (!t) return;
    runToken++;            // cancel any previous module
    const tok = runToken;
    currentId = id;
    titleEl.textContent = t.title;
    if (badgeEl) {
      badgeEl.textContent = t.sim ? "SIM" : "REAL";
      badgeEl.classList.toggle("real", !t.sim);
    }
    output.innerHTML = "";
    inputRow.style.display = t.needInput ? "flex" : "none";
    if (t.needInput) {
      inputEl.placeholder = t.placeholder;
      inputEl.value = (param && String(param).trim()) ? String(param).trim() : (t.prefill || "");
    }
    modal.classList.add("open");
    tick();
    t.run(tok);
  }

  goBtn.addEventListener("click", () => {
    if (!currentId) return;
    runToken++;
    const tok = runToken;
    TOOLS[currentId].run(tok);
  });

  closeBtn.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open") && e.target !== inputEl) closeModal();
  });

  /* ─── toolbar search filter ─── */
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      document.querySelectorAll(".tool-btn").forEach(b => {
        const show = !q || b.dataset.tool.indexOf(q) !== -1 || b.textContent.toLowerCase().indexOf(q) !== -1;
        b.style.display = show ? "" : "none";
      });
      document.querySelectorAll(".tool-group").forEach(g => {
        const any = [...g.querySelectorAll(".tool-btn")].some(b => b.style.display !== "none");
        g.style.display = any ? "" : "none";
      });
    });
  }

  /* ═══════════ RECON — network / public-data intelligence ═══════════ */

  // ── DNS LOOKUP (real — Cloudflare DNS-over-HTTPS) ──
  function dns(tok) {
    (async () => {
      const host = inputEl.value.trim() || "example.com";
      line("dim", "[>] Resolving " + host + " — Cloudflare DNS-over-HTTPS (real public DNS)");
      let total = 0;
      for (const type of ["A", "AAAA", "MX"]) {
        if (tok !== runToken) return;
        try {
          const res = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(host) + "&type=" + type,
            { headers: { "Accept": "application/dns-json" } });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          const answers = (data.Answer || []).slice(0, 6);
          total += answers.length;
          if (!answers.length) line("dim", "  " + type + "  (no records)");
          answers.forEach(a => line("", "  " + type.padEnd(4) + "  " + a.data + "   TTL " + a.TTL));
          beep(700, 0.02, "square", 0.02);
          await sleep(220);
        } catch (e) {
          line("err", "[!] DNS lookup failed: " + e.message);
        }
      }
      if (tok !== runToken) return;
      line("", " ");
      line("ok", "══ RESOLVED: " + total + " records ══");
      line("warn", "[!] REAL data — public DNS se. Har website ka DNS check karna bilkul legal hai (dig/nslookup jaisa).");
      success();
    })().catch(() => {});
  }

  // ── REVERSE DNS (real — PTR via Cloudflare DoH) ──
  function revdns(tok) {
    (async () => {
      let ip = inputEl.value.trim() || "8.8.8.8";
      const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (!m) { line("err", "[!] Valid IPv4 daalo — e.g. 8.8.8.8"); buzz(); return; }
      const rev = m[4] + "." + m[3] + "." + m[2] + "." + m[1] + ".in-addr.arpa";
      line("dim", "[>] Reverse lookup " + ip + " — PTR record (Cloudflare DoH)");
      try {
        const res = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(rev) + "&type=PTR",
          { headers: { "Accept": "application/dns-json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const answers = data.Answer || [];
        if (!answers.length) line("warn", "  PTR  (no reverse record — IP ka koi hostname nahi)");
        answers.forEach(a => line("ok", "  PTR  " + a.data));
        line("", " ");
        line("ok", "══ REVERSE DNS COMPLETE ══");
        line("warn", "[!] Public DNS data — kisi bhi IP ka PTR dekhna legal hai. dig -x jaisa.");
        success();
      } catch (e) {
        line("err", "[!] Reverse lookup failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── WHOIS (real — ICANN RDAP, public registry) ──
  function whois(tok) {
    (async () => {
      let domain = inputEl.value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      if (!domain) domain = "example.com";
      const isIp = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(domain);
      line("dim", "[>] WHOIS lookup: " + domain + " — public ICANN RDAP registry");
      await sleep(300);
      if (tok !== runToken) return;
      try {
        const txt = await proxyGet((isIp ? "https://rdap.org/ip/" : "https://rdap.org/domain/") + encodeURIComponent(domain));
        const d = JSON.parse(txt);
        line("ok", "══ WHOIS — " + (d.ldhName || domain) + " ══");
        (d.events || []).forEach(ev => {
          if (ev.eventAction) line("", "  " + ev.eventAction.toUpperCase().padEnd(14) + (ev.eventDate || "?"));
        });
        (d.entities || []).forEach(en => {
          const roles = (en.roles || []).join("/");
          let name = "";
          if (en.vcardArray && en.vcardArray[1]) {
            const fn = en.vcardArray[1].find(v => v[0] === "fn");
            if (fn) name = fn[3];
          }
          if (roles || name) line("", "  " + (roles || "ENTITY").toUpperCase().padEnd(14) + name);
        });
        line("", "  " + "NAMESERVERS".padEnd(14));
        (d.nameservers || []).forEach(ns => line("", "    → " + ns.ldhName));
        (d.status || []).forEach(s => line("", "  " + "STATUS".padEnd(14) + s));
        if (d.registrar) line("", "  " + "REGISTRAR".padEnd(14) + d.registrar);
        line("", " ");
        line("warn", "[!] WHOIS = public registration data (ICANN). Privacy-protected domains hidden rakh sakte hain.");
        success();
      } catch (e) {
        line("err", "[!] WHOIS failed: " + e.message + " — domain valid hai na? (e.g. example.com)");
        buzz();
      }
    })().catch(() => {});
  }

  // ── SUBDOMAIN ENUM (real — certificate transparency logs, passive OSINT) ──
  function subenum(tok) {
    (async () => {
      let domain = inputEl.value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      if (!domain) domain = "example.com";
      line("dim", "[>] Enumerating subdomains of " + domain + " — passive OSINT (crt.sh cert-transparency logs)");
      let hosts = [];
      try {
        const json = await proxyGet("https://crt.sh/?q=%25." + encodeURIComponent(domain) + "&output=json");
        const arr = JSON.parse(json);
        const seen = {};
        (arr || []).forEach(r => {
          (r.name_value || "").split("\n").forEach(n => {
            const c = n.trim().toLowerCase().replace(/^\*\./, "");
            if (c && !seen[c]) { seen[c] = true; hosts.push(c); }
          });
        });
      } catch (e) {
        // fallback: query without wildcard
        try {
          const json = await proxyGet("https://crt.sh/?q=" + encodeURIComponent(domain) + "&output=json");
          const arr = JSON.parse(json);
          const seen = {};
          (arr || []).forEach(r => {
            (r.name_value || "").split("\n").forEach(n => {
              const c = n.trim().toLowerCase().replace(/^\*\./, "");
              if (c && !seen[c]) { seen[c] = true; hosts.push(c); }
            });
          });
        } catch (e2) {
          throw new Error("crt.sh unavailable: " + e2.message);
        }
      }
      hosts = hosts.filter(h => h !== domain).sort();
      if (tok !== runToken) return;
      line("", " ");
      if (!hosts.length) line("warn", "  Koi subdomain nahi mila — domain check karo.");
      else {
        line("ok", "══ " + hosts.length + " SUBDOMAINS FOUND ══");
        hosts.slice(0, 40).forEach(h => line("", "  " + h));
        if (hosts.length > 40) line("dim", "  …and " + (hosts.length - 40) + " more");
      }
      line("warn", "[!] Passive OSINT — public certificate logs se. Kisi system ko touch nahi kiya — 100% legal.");
      success();
    })().catch(e => { line("err", "[!] " + e.message); buzz(); });
  }

  // ── PORT SCAN (real — check-host.net public nodes; AUTHORIZED TARGETS ONLY) ──
  const SCAN_PORTS = [22, 80, 443, 3389, 8080, 8443];

  async function chRequest(kind, host) {
    const url = "https://check-host.net/api/1.0/" + kind + "?host=" + encodeURIComponent(host) + "&max_nodes=1";
    const txt = await proxyGet(url);
    const d = JSON.parse(txt);
    if (!d.request_id) throw new Error("check-host: no request_id");
    return d.request_id;
  }

  async function chResult(rid) {
    for (let i = 0; i < 9; i++) {
      await sleep(2200);
      try {
        const txt = await proxyGet("https://check-host.net/api/1.0/check-result/" + rid);
        const d = JSON.parse(txt);
        const vals = Object.values(d).filter(v => Array.isArray(v));
        if (!vals.length) continue;
        const done = vals.every(v =>
          v.length && Array.isArray(v[0]) &&
          String(v[0][0]).toLowerCase() !== "waiting" && v[0][0] !== undefined);
        if (done) return vals.flat();
      } catch (e) { /* keep polling */ }
    }
    throw new Error("check timed out");
  }

  function portscan(tok) {
    (async () => {
      let target = inputEl.value.trim();
      if (!target) target = "scanme.nmap.org";
      line("err", "[⚠] AUTHORIZED TARGETS ONLY — apne systems, labs (TryHackMe/HackTheBox) ya scanme.nmap.org (nmap ka official test host). Bina permission scan karna crime hai (IT Act Sec 66).");
      line("dim", "[>] Port scan: " + target + " — real TCP checks via check-host.net public nodes");
      try {
        const rids = [];
        for (const p of SCAN_PORTS) {
          if (tok !== runToken) return;
          line("dim", "  [>] probing port " + p + " …");
          rids.push({ p, rid: await chRequest("check-tcp", target + ":" + p) });
        }
        for (const { p, rid } of rids) {
          if (tok !== runToken) return;
          try {
            const lines = await chResult(rid);
            const item = lines.find(l => Array.isArray(l) && l[0] && String(l[0]).toLowerCase() !== "waiting") || lines[0];
            const open = item && item[1] === true;
            const msg = item && item[2] ? String(item[2]) : "";
            line(open ? "ok" : "dim", (open ? "  [OPEN]   " : "  [CLOSED] ") + String(p).padEnd(6) + (open ? (msg || "accepting connections") : "filtered/closed"));
            beep(open ? 990 : 440, 0.03, "square", 0.02);
          } catch (e) {
            line("warn", "  [" + p + "] check failed: " + e.message);
          }
        }
        if (tok !== runToken) return;
        line("", " ");
        line("ok", "══ SCAN COMPLETE ══");
        line("warn", "[!] Open ports = services running. Hamesha sirf authorized systems par. Apne router/VPS ki config verify karne ke liye useful hai.");
        success();
      } catch (e) {
        line("err", "[!] Port scan failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── TRACEROUTE (real — check-host.net nodes) ──
  function trace(tok) {
    (async () => {
      let target = inputEl.value.trim() || "example.com";
      line("dim", "[>] Traceroute: " + target + " — hop-by-hop route via check-host.net (public network)");
      try {
        const rid = await chRequest("check-traceroute", target);
        const lines = await chResult(rid);
        if (tok !== runToken) return;
        line("ok", "══ ROUTE TO " + target + " ══");
        lines.forEach(item => {
          if (!Array.isArray(item) || !item.length) return;
          line("", "  hop " + item.map(v => (v === null ? "*" : v)).join("  "));
        });
        line("warn", "[!] Route = public routing info (jaisa traceroute/tracert chalaoge). Nodes = check-host ke servers.");
        success();
      } catch (e) {
        line("err", "[!] Traceroute failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── PING (real — ICMP via check-host.net) ──
  function ping(tok) {
    (async () => {
      let target = inputEl.value.trim() || "example.com";
      line("dim", "[>] Ping: " + target + " — ICMP echo via check-host.net public nodes");
      try {
        const rid = await chRequest("check-ping", target);
        const lines = await chResult(rid);
        if (tok !== runToken) return;
        let ok = 0;
        lines.forEach(item => {
          if (!Array.isArray(item) || !item.length) return;
          const time = item[1];
          const alive = time !== null && time !== undefined && time !== false;
          if (alive) ok++;
          line(alive ? "ok" : "err", "  " + String(item[0]).padEnd(16) + (alive ? time + " ms" : "NO RESPONSE"));
        });
        line("", " ");
        line(ok ? "ok" : "err", "══ PING RESULT: " + (ok ? "HOST ALIVE (" + ok + "/" + lines.length + ")" : "HOST DOWN") + " ══");
        line("warn", "[!] Real ICMP echo — host up/down check, bilkul legal (jaisa cmd ka ping).");
        success();
      } catch (e) {
        line("err", "[!] Ping failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── CERTIFICATES (real — crt.sh transparency logs) ──
  function cert(tok) {
    (async () => {
      let domain = inputEl.value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
      if (!domain) domain = "example.com";
      line("dim", "[>] Certificate transparency: " + domain + " — public SSL cert logs (crt.sh)");
      await sleep(300);
      if (tok !== runToken) return;
      try {
        const json = await proxyGet("https://crt.sh/?q=" + encodeURIComponent(domain) + "&output=json");
        const arr = JSON.parse(json) || [];
        if (!arr.length) { line("warn", "  Koi certificate nahi mila."); }
        arr.slice(0, 6).forEach(c => {
          if (tok !== runToken) return;
          const sans = (c.name_value || "").split("\n").slice(0, 6);
          line("", " ");
          line("ok", "  CN  " + (c.common_name || "?"));
          line("", "    issuer : " + (c.issuer_name || "?"));
          line("", "    valid  : " + (c.not_before || "?") + "  →  " + (c.not_after || "?"));
          line("", "    SANs   : " + sans.join(", ") + ((c.name_value || "").split("\n").length > 6 ? " …" : ""));
        });
        line("", " ");
        line("ok", "══ " + arr.length + " CERTS IN LOGS ══");
        line("warn", "[!] Certificate transparency = public logs. Har SSL cert yahan hota hai — dekhna legal (SSL Labs jaisa).");
        success();
      } catch (e) {
        line("err", "[!] Cert lookup failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── HTTP PROBE (real — security headers of a public URL) ──
  function probe(tok) {
    (async () => {
      let url = inputEl.value.trim() || "https://example.com";
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      line("dim", "[>] Probing " + url + " — GET via public CORS proxy (jaise securityheaders.com)");
      await sleep(400);
      if (tok !== runToken) return;
      try {
        const res = await fetch("https://api.allorigins.win/get?url=" + encodeURIComponent(url));
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const h = data.headers || {};
        const get = (n) => h[n] || h[n.toLowerCase()] || h[n.toUpperCase()];
        const checks = [
          ["Strict-Transport-Security", "HSTS — HTTPS enforce"],
          ["Content-Security-Policy", "CSP — XSS protection"],
          ["X-Frame-Options", "clickjacking protection"],
          ["X-Content-Type-Options", "MIME sniffing band"],
          ["Referrer-Policy", "referrer leak control"],
          ["Permissions-Policy", "browser feature restriction"]
        ];
        let score = 0;
        checks.forEach(([name, desc]) => {
          if (tok !== runToken) return;
          const v = get(name);
          if (v) { score++; line("ok", "  [✓] " + name + "  " + String(v).slice(0, 55)); }
          else   { line("warn", "  [✗] " + name + " missing (" + desc + ")"); }
        });
        if (tok !== runToken) return;
        line("", " ");
        const grade = score >= 5 ? "A" : score >= 3 ? "B" : score >= 1 ? "C" : "F";
        line("ok", "══ SECURITY GRADE: " + grade + "   (" + score + "/6 headers) ══");
        line("warn", "[!] Yeh site ke publicly-served headers hain — check karna legal hai (curl -I jaisa).");
        success();
      } catch (e) {
        line("err", "[!] Probe failed: " + e.message);
        line("dim", "[>] Proxy busy ho sakta hai — RUN dobara dabao.");
        buzz();
      }
    })().catch(() => {});
  }

  /* ═══════════ OSINT — public-data intelligence ═══════════ */

  // ── GEOIP (real — ipwho.is) ──
  function geoip(tok) {
    (async () => {
      const ip = inputEl.value.trim();
      line("dim", "[>] IP geolocation — public IP-intelligence DB (ipwho.is)");
      await sleep(300);
      if (tok !== runToken) return;
      try {
        const res = await fetch("https://ipwho.is/" + encodeURIComponent(ip || ""));
        if (!res.ok) throw new Error("HTTP " + res.status);
        const d = await res.json();
        if (!d || d.success === false) { line("err", "[!] Invalid IP: " + (ip || "?")); buzz(); return; }
        const rows = [
          ["IP", d.ip], ["TYPE", d.type], ["COUNTRY", d.country], ["REGION", d.region], ["CITY", d.city],
          ["COORDS", (d.latitude !== null && d.latitude !== undefined ? d.latitude + ", " + d.longitude : "")],
          ["ISP", d.connection && d.connection.isp],
          ["ORG", d.connection && d.connection.org],
          ["TIMEZONE", d.timezone && d.timezone.id]
        ];
        line("ok", "══ IP INTELLIGENCE ══");
        rows.forEach(r => { if (r[1]) line("", "  " + r[0].padEnd(14) + r[1]); });
        line("warn", "[!] Approximate location (public geo-DB) — exact address nahi. Yeh kisi ka picha karne ka tool nahi hai.");
        success();
      } catch (e) {
        line("err", "[!] GeoIP failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── GITHUB OSINT (real — public profiles, no key) ──
  function github(tok) {
    (async () => {
      const u = inputEl.value.trim().replace(/^@/, "");
      if (!u) { line("err", "[!] Username daalo — e.g. github torvalds"); buzz(); return; }
      line("dim", "[>] GitHub public profile: @" + u + " — api.github.com (public data, no key)");
      try {
        const res = await fetch("https://api.github.com/users/" + encodeURIComponent(u));
        if (!res.ok) {
          line("err", res.status === 404 ? "[!] User nahi mila: " + u : "[!] HTTP " + res.status + " (limit 60/hr bina key)");
          buzz();
          return;
        }
        const d = await res.json();
        if (tok !== runToken) return;
        const rows = [
          ["LOGIN", d.login], ["NAME", d.name], ["BIO", d.bio], ["COMPANY", d.company], ["LOCATION", d.location],
          ["BLOG", d.blog], ["REPOS", d.public_repos], ["FOLLOWERS", d.followers], ["FOLLOWING", d.following],
          ["CREATED", (d.created_at || "").slice(0, 10)], ["URL", d.html_url]
        ];
        line("ok", "══ GITHUB PROFILE ══");
        rows.forEach(r => { if (r[1] !== undefined && r[1] !== null && String(r[1]) !== "") line("", "  " + r[0].padEnd(14) + r[1]); });
        line("warn", "[!] SIRF public data (OSINT). GitHub API rate limit 60 req/hr bina key — wahi data website par dikhta hai.");
        success();
      } catch (e) {
        line("err", "[!] GitHub lookup failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── MY IP (real — ipify) ──
  function myip(tok) {
    (async () => {
      line("dim", "[>] Fetching your public IP (api.ipify.org)");
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const d = await res.json();
        if (tok !== runToken) return;
        line("ok", "══ PUBLIC IP ══");
        line("ok", "  " + d.ip);
        line("warn", "[!] Ye aapka internet-facing IP hai — har website ko dikhta hai. Chhupana ho toh VPN/proxy, operator.");
        success();
      } catch (e) {
        line("err", "[!] " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  // ── SYSTEM RECON (real — browser APIs, aapka apna system) ──
  function recon(tok) {
    (async () => {
      line("ok", "══ LOCAL NODE RECON ══");
      line("dim", "[>] Gathering fingerprint — yeh aapki apni machine hai, sab local browser data.");
      const rows = [
        ["OS/PLATFORM", navigator.platform || "?"],
        ["LANGUAGE", navigator.language || "?"],
        ["CORES", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " logical" : "?"],
        ["MEMORY", navigator.deviceMemory ? "~" + navigator.deviceMemory + " GB" : "?"],
        ["SCREEN", (screen.width || "?") + "x" + (screen.height || "?")],
        ["ONLINE", navigator.onLine ? "YES" : "NO"]
      ];
      if (navigator.connection && navigator.connection.effectiveType) {
        rows.push(["NET TYPE", String(navigator.connection.effectiveType).toUpperCase()]);
      }
      for (const r of rows) {
        if (tok !== runToken) return;
        line("", "  " + r[0].padEnd(14) + r[1]);
        await sleep(130);
      }
      if (navigator.getBattery) {
        try {
          const b = await navigator.getBattery();
          if (tok !== runToken) return;
          line("", "  " + "BATTERY".padEnd(14) + Math.round(b.level * 100) + "%" + (b.charging ? " (charging)" : ""));
        } catch (e) { /* noop */ }
      }
      if (tok !== runToken) return;
      line("", " ");
      line("ok", "══ FINGERPRINT COMPLETE ══");
      line("warn", "[!] TIP: yeh data har website ko dikhta hai. Privacy settings tighten karo, operator.");
      success();
    })().catch(() => {});
  }

  // ── ARSENAL (catalog — Kali-style Linux tools reference) ──
  const ARSENAL = [
    { n: "nmap",         c: "SCANNER",  d: "Network mapper — host discovery, port scanning, service detection (Linux ka king tool)." },
    { n: "masscan",      c: "SCANNER",  d: "Nmap jaisa par ultra-fast — internet-scale port scans ke liye." },
    { n: "netcat",       c: "NETWORK",  d: "TCP/UDP swiss-army knife — banner grab, port test, file transfer." },
    { n: "socat",        c: "NETWORK",  d: "netcat++ — relay, tunnels, port forwarding." },
    { n: "tcpdump",      c: "NETWORK",  d: "CLI packet capture — raw packets ka analysis." },
    { n: "wireshark",    c: "NETWORK",  d: "GUI packet analyzer — network traffic ka x-ray." },
    { n: "hydra",        c: "PASSWORD", d: "Online brute-force (SSH/FTP/forms) — sirf labs mein." },
    { n: "john",         c: "PASSWORD", d: "Offline password cracker (hash files) — apne hashes par." },
    { n: "hashcat",      c: "PASSWORD", d: "World's fastest GPU hash cracker." },
    { n: "aircrack-ng",  c: "WIRELESS", d: "Wi-Fi security suite — monitor mode, capture, crack (sirf apne Wi-Fi)." },
    { n: "bettercap",    c: "NETWORK",  d: "MITM framework — ARP spoofing tests, labs mein." },
    { n: "responder",    c: "NETWORK",  d: "LLMNR/NBT-NS poisoning — internal pentest labs." },
    { n: "metasploit",   c: "EXPLOIT",  d: "Exploit framework — vulnerability validation, CTF labs." },
    { n: "searchsploit", c: "EXPLOIT",  d: "Exploit-DB ka local search — CVE/research." },
    { n: "msfvenom",     c: "EXPLOIT",  d: "Payload generation — sirf labs/CTF." },
    { n: "sqlmap",       c: "WEB",      d: "SQL injection automation — sirf authorized targets." },
    { n: "nikto",        c: "WEB",      d: "Web server scanner — known misconfigs." },
    { n: "gobuster",     c: "WEB",      d: "Directory/subdomain brute-force — content discovery." },
    { n: "ffuf",         c: "WEB",      d: "Fast web fuzzer — parameters, vhosts, dirs." },
    { n: "wpscan",       c: "WEB",      d: "WordPress vulnerability scanner." },
    { n: "burpsuite",    c: "WEB",      d: "Web proxy — traffic intercept/modify (learning standard)." },
    { n: "wafw00f",      c: "WEB",      d: "WAF detection — site ke saamne firewall hai kya." },
    { n: "theHarvester", c: "OSINT",    d: "Emails + subdomains — public sources se gathering." },
    { n: "recon-ng",     c: "OSINT",    d: "OSINT framework — modules ke saath info gathering." },
    { n: "dnsrecon",     c: "OSINT",    d: "DNS enumeration + zone transfer tests." },
    { n: "fierce",       c: "OSINT",    d: "DNS subdomain brute-force (classic)." },
    { n: "enum4linux",   c: "OSINT",    d: "Windows/SMB enumeration — users, shares (labs)." },
    { n: "smbclient",    c: "NETWORK",  d: "SMB client — shares access test (labs)." },
    { n: "exiftool",     c: "FORENSICS",d: "Metadata extraction — photos/files ke hidden data." },
    { n: "binwalk",      c: "FORENSICS",d: "Firmware / embedded file analysis." },
    { n: "strings",      c: "FORENSICS",d: "Binary mein printable strings dhundo." },
    { n: "volatility",   c: "FORENSICS",d: "Memory forensics — RAM dump analysis." },
    { n: "chisel",       c: "NETWORK",  d: "Fast TCP/UDP tunnel — pivot labs." },
    { n: "impacket",     c: "EXPLOIT",  d: "Python network protocols toolkit — pentest labs." },
    { n: "tor",          c: "PRIVACY",  d: "Anonymous onion routing — Tor Browser, free anonymity." },
    { n: "openvpn",      c: "PRIVACY",  d: "Open-source VPN protocol — self-hosted secure tunnels." },
    { n: "wireguard",    c: "PRIVACY",  d: "Modern fast VPN protocol — kernel-level, minimal config." },
    { n: "proxychains",  c: "PRIVACY",  d: "Kisi bhi tool ko Tor/proxy chain se route karo (labs)." },
    { n: "macchanger",   c: "PRIVACY",  d: "MAC address spoofing — sirf apne devices par legal." }
  ];

  function renderArsenal(withSound) {
    const q = inputEl.value.trim().toLowerCase();
    output.innerHTML = "";
    line("ok", "══ ARSENAL — Linux/Kali security tools (reference) ══");
    line("dim", "[>] Yeh catalog hai — in tools ki actual execution browser se possible nahi. Ethical use: apne systems, labs (TryHackMe/HackTheBox), CTFs.");
    line("", " ");
    let count = 0;
    ARSENAL.forEach(t => {
      if (q && t.n.indexOf(q) === -1 && t.c.toLowerCase().indexOf(q) === -1) return;
      count++;
      line("", "  [" + t.c.padEnd(9) + "] " + t.n.padEnd(14) + " — " + t.d);
    });
    line("", " ");
    line("dim", "[" + count + " tools] — type karke filter karo (e.g. wifi, web, scan…). In tools ki legal practice sirf apne systems/labs par.");
    if (withSound) success();
  }

  function arsenal(tok) {
    renderArsenal(true);
  }

  // live filter for the arsenal catalog (no beep on every keystroke)
  if (inputEl) {
    inputEl.addEventListener("input", () => {
      if (currentId === "arsenal") renderArsenal(false);
    });
  }

  /* ═══════════ CRYPTO — local encoding & ciphers ═══════════ */

  // ── HASH (real — WebCrypto SHA-256 / SHA-512) ──
  function hash(tok) {
    (async () => {
      if (!window.crypto || !crypto.subtle) {
        line("err", "[!] WebCrypto unavailable — localhost server se chalao (secure context).");
        buzz();
        return;
      }
      const text = inputEl.value.trim() || "hello world";
      line("dim", '[>] Hashing: "' + text.slice(0, 40) + (text.length > 40 ? "…" : "") + '"  (real SHA — WebCrypto)');
      const enc = new TextEncoder();
      for (const bits of [256, 512]) {
        if (tok !== runToken) return;
        const buf = await crypto.subtle.digest("SHA-" + bits, enc.encode(text));
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        line("", "  SHA-" + bits + "  " + hex);
        beep(700, 0.02, "square", 0.02);
        await sleep(220);
      }
      if (tok !== runToken) return;
      line("", " ");
      line("ok", "══ HASHES GENERATED ══");
      line("warn", '[!] REAL hai — "hello world" ka SHA-256 hamesha b94d27b9…de9 hota hai. Online verifier se match karo. (Linux: sha256sum)');
      success();
    })().catch(() => {});
  }

  // ── CRYPTO (real — AES-256-GCM, fully local) ──
  function crypto(tok) {
    (async () => {
      if (!window.crypto || !crypto.subtle) {
        line("err", "[!] WebCrypto unavailable — localhost server se chalao (secure context).");
        buzz();
        return;
      }
      const enc = new TextEncoder();
      const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
      const unb64 = (s) => Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0));
      const input = inputEl.value.trim();

      // DECRYPT mode: cipher|key
      if (input.includes("|")) {
        line("dim", "[>] Decrypt mode — AES-256-GCM");
        const [ctB64, keyB64] = input.split("|").map(s => s.trim());
        try {
          const raw = unb64(keyB64);
          const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
          const full = unb64(ctB64);
          const iv = full.slice(0, 12);
          const ct = full.slice(12);
          const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
          if (tok !== runToken) return;
          line("", " ");
          line("ok", "══ DECRYPTED ══");
          line("ok", "  " + new TextDecoder().decode(plain));
          success();
        } catch (e) {
          line("err", "[!] Decrypt failed — galat key ya corrupted ciphertext.");
          buzz();
        }
        return;
      }

      // ENCRYPT mode
      const msg = input || "hello world";
      line("dim", "[>] Encrypt mode — AES-256-GCM (real WebCrypto, sab local, kuch server nahi jaata)");
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(msg));
      const rawKey = await crypto.subtle.exportKey("raw", key);
      const packed = new Uint8Array(12 + ct.byteLength);
      packed.set(iv);
      packed.set(new Uint8Array(ct), 12);
      if (tok !== runToken) return;
      line("", " ");
      line("ok", "══ ENCRYPTED ══");
      line("ok", "  CIPHER: " + b64(packed));
      line("ok", "  KEY   : " + b64(rawKey));
      line("dim", '[>] Decrypt: input mein paste karo  "CIPHER|KEY"  aur RUN dabao.');
      line("warn", "[!] REAL AES-256-GCM encryption — key kisi ke saath share mat karna. Sab local hai (jaisa openssl).");
      success();
    })().catch(() => {});
  }

  // ── BASE64 (local, binary-safe) ──
  function base64(tok) {
    const input = inputEl.value.trim();
    const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
    const b64d = (s) => decodeURIComponent(escape(atob(s)));
    line("dim", "[>] Base64 — local encode/decode (binary-safe)");
    line("ok", "══ BASE64 ENCODED ══");
    line("", "  " + b64e(input));
    if (/^[A-Za-z0-9+/=\s]+$/.test(input) && input.length % 4 === 0 && input.length > 0) {
      try {
        line("ok", "══ BASE64 DECODED ══");
        line("", "  " + b64d(input));
      } catch (e) {
        line("dim", "  (input valid base64 nahi laga — sirf encode dikhaya)");
      }
    }
    line("warn", "[!] Base64 encryption NAHI hai — sirf encoding (Linux: base64 command). Real security ke liye CRYPTO tool.");
    success();
  }

  // ── HEX (local) ──
  function hex(tok) {
    const input = inputEl.value.trim();
    const enc = [...new TextEncoder().encode(input)].map(b => b.toString(16).padStart(2, "0")).join(" ");
    line("dim", "[>] Hex — local encode/decode");
    line("ok", "══ HEX ENCODED ══");
    line("", "  " + enc);
    if (/^[0-9a-f\s]+$/i.test(input)) {
      const bytes = input.replace(/\s+/g, "").match(/.{2}/g);
      if (bytes && bytes.length) {
        const nums = bytes.map(b => parseInt(b, 16));
        const printable = nums.every(n => (n >= 32 && n <= 126) || n === 10 || n === 13 || n === 9);
        if (printable) {
          line("ok", "══ HEX DECODED ══");
          line("", "  " + nums.map(n => String.fromCharCode(n)).join(""));
        }
      }
    }
    line("warn", "[!] Hex sirf encoding hai — real crypto nahi (Linux: xxd/hexdump).");
    success();
  }

  // ── ROT / CAESAR (classic cipher, local) ──
  function rot13(tok) {
    let input = inputEl.value.trim();
    let shift = 13;
    const m = input.match(/^(\d{1,3})\s+([\s\S]*)$/);
    if (m) { shift = parseInt(m[1], 10) % 26; input = m[2]; }
    const out = [...input].map(ch => {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) return String.fromCharCode(65 + (c - 65 + shift) % 26);
      if (c >= 97 && c <= 122) return String.fromCharCode(97 + (c - 97 + shift) % 26);
      return ch;
    }).join("");
    line("dim", "[>] ROT" + shift + " cipher — classic substitution, local (Linux: tr/rot13)");
    line("ok", "══ ROT" + shift + " ══");
    line("", "  " + out);
    line("warn", "[!] Caesar/ROT sirf seekhne ke liye hai — aaj ke standards se bilkul insecure. Real crypto = CRYPTO tool.");
    success();
  }

  // ── URL ENCODE/DECODE (local) ──
  function urlcode(tok) {
    const input = inputEl.value.trim();
    line("dim", "[>] URL encoding — local");
    line("ok", "══ URL ENCODED ══");
    line("", "  " + encodeURIComponent(input));
    line("ok", "══ URL DECODED ══");
    try {
      line("", "  " + decodeURIComponent(input));
    } catch (e) {
      line("warn", "  (invalid %-sequence — decode possible nahi)");
    }
    line("warn", "[!] URL-encoding data ko URI-safe banata hai (Linux: python urllib). Web attacks samajhne mein basic hai.");
    success();
  }

  // ── HASH ID (pattern-based detector, like hashID) ──
  function hashid(tok) {
    const input = inputEl.value.trim();
    if (!input) { line("err", "[!] Hash/digest paste karo — e.g. 5f4dcc3b5aa765d61d8327deb882cf99"); buzz(); return; }
    const t = input.replace(/\s+/g, "");
    let out = [];
    if (/^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(t)) out.push("bcrypt ($2*) — password hashing, Linux /etc/shadow");
    if (/^\$5\$/.test(t)) out.push("sha256crypt ($5$) — Linux shadow");
    if (/^\$6\$/.test(t)) out.push("sha512crypt ($6$) — Linux shadow (default)");
    if (/^\$1\$/.test(t)) out.push("md5crypt ($1$) — older Linux shadow");
    if (/^\$apr1\$\d+\$[./A-Za-z0-9]{22}$/.test(t)) out.push("Apache MD5 crypt ($apr1$) — htpasswd");
    if (/^\$P\$[./A-Za-z0-9]{31}$/.test(t)) out.push("phpass ($P$) — WordPress/Drupal");
    if (/^\$H\$[./A-Za-z0-9]{31}$/.test(t)) out.push("phpass ($H$) — WordPress (portable version)");
    if (/^\$7\$/.test(t)) out.push("Drupal 7 hash ($7$)");
    if (/^[0-9a-f]{32}$/i.test(t)) out.push("MD5 / NTLM / MD4 / MySQL323 (32 hex) — sabse common digest");
    if (/^[0-9a-f]{40}$/i.test(t)) out.push("SHA-1 / MySQL5 / RIPEMD-160 (40 hex)");
    if (/^[0-9a-f]{56}$/i.test(t)) out.push("SHA-224 (56 hex)");
    if (/^[0-9a-f]{64}$/i.test(t)) out.push("SHA-256 / SHA3-256 (64 hex)");
    if (/^[0-9a-f]{96}$/i.test(t)) out.push("SHA-384 / SHA3-384 (96 hex)");
    if (/^[0-9a-f]{128}$/i.test(t)) out.push("SHA-512 / SHA3-512 / Whirlpool (128 hex)");
    if (/^[0-9a-f]{8}$/i.test(t)) out.push("CRC32 (8 hex) — checksum, secure NAHI");
    if (/^[0-9a-f]{32}:[0-9a-f]{32}$/i.test(t)) out.push("NTLM LM:hash pair / Cisco type 5");
    if (/^[A-Za-z0-9+/=]{20,}$/.test(t) && t.length % 4 === 0 && !out.length) out.push("Possible base64-encoded data (hash nahi)");
    if (!out.length) out.push("Unknown format — koi known pattern nahi mila");
    line("dim", "[>] Hash identifier — pattern analysis (hashID/hashcat --identify jaisa)");
    line("ok", "══ CANDIDATES ══");
    out.forEach(o => line("", "  • " + o));
    line("warn", "[!] Hash type pehchanna = cracking se pehle ka step. Cracking sirf apne hashes par legal (John/Hashcat ke liye).");
    success();
  }

  // ── PASSWORD (real strength analysis + CSPRNG generator) ──
  function passwd(tok) {
    (async () => {
      const input = inputEl.value.trim();

      // GENERATOR
      if (!input) {
        const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*()-_=+[]{}"];
        const all = sets.join("");
        const len = 18;
        const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));
        const pw = [];
        sets.forEach(s => pw.push(s[rnd(1)[0] % s.length]));
        while (pw.length < len) pw.push(all[rnd(1)[0] % all.length]);
        for (let i = pw.length - 1; i > 0; i--) {
          const j = rnd(1)[0] % (i + 1);
          const tmp = pw[i]; pw[i] = pw[j]; pw[j] = tmp;
        }
        line("", " ");
        line("ok", "══ GENERATED PASSWORD ══");
        line("ok", "  " + pw.join(""));
        line("dim", "[>] crypto.getRandomValues (real CSPRNG) — length 18, sab 4 char-sets guaranteed.");
        line("warn", "[!] Copy karke apne password manager mein daal do. Kisi server ko nahi bheja gaya (Linux: openssl rand).");
        success();
        return;
      }

      // STRENGTH CHECK
      const pw = input;
      const len = pw.length;
      let pools = 0;
      if (/[a-z]/.test(pw)) pools++;
      if (/[A-Z]/.test(pw)) pools++;
      if (/[0-9]/.test(pw)) pools++;
      if (/[^a-zA-Z0-9]/.test(pw)) pools++;
      const charsetSizes = [26, 26, 10, 33];
      const charset = charsetSizes.slice(0, pools).reduce((a, b) => a + b, 0) || 1;
      const bits = len * Math.log2(charset);
      const score = Math.min(100, Math.round(bits / 1.6));
      line("dim", "[>] Analysing: " + pw.replace(/./g, "•") + "  (length " + len + ")");
      await sleep(450);
      if (tok !== runToken) return;
      line("", "  LENGTH       " + len);
      line("", "  CHAR POOLS   " + pools + "/4 (lower / upper / digit / symbol)");
      line("", "  EST. ENTROPY ~" + bits.toFixed(0) + " bits");
      line("", " ");
      const grade = bits >= 80 ? "STRONG" : bits >= 50 ? "GOOD" : bits >= 30 ? "WEAK" : "CRITICAL";
      line(bits >= 50 ? "ok" : "err", "══ SCORE: " + score + "/100 — " + grade + " ══");
      line("warn", "[!] Real math: entropy = length × log2(charset). 12+ chars with all 4 pools = best. Passwords yahan se kabhi bheje nahi jaate.");
      success();
    })().catch(() => {});
  }

  /* ═══════════ NET — networking math & helpers ═══════════ */

  // ── SUBNET CALCULATOR (real CIDR math, local) ──
  function subnet(tok) {
    const m = inputEl.value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
    if (!m) { line("err", "[!] Format: 192.168.1.0/24"); buzz(); return; }
    const octs = m.slice(1, 5).map(o => parseInt(o, 10));
    const cidr = parseInt(m[5], 10);
    if (octs.some(o => o > 255)) { line("err", "[!] Har octet 0–255 ke beech hona chahiye"); buzz(); return; }
    if (cidr > 32) { line("err", "[!] CIDR 0–32 ho sakta hai"); buzz(); return; }
    const ip = ((octs[0] << 24) | (octs[1] << 16) | (octs[2] << 8) | octs[3]) >>> 0;
    const mask = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const net = (ip & mask) >>> 0;
    const bcast = (net | (~mask >>> 0)) >>> 0;
    const f = (v) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join(".");
    const hosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.pow(2, 32 - cidr) - 2;
    line("dim", "[>] Subnet calculator — real CIDR math, local (Linux: ipcalc)");
    line("ok", "══ NETWORK " + f(net) + "/" + cidr + " ══");
    line("", "  " + "MASK".padEnd(12) + f(mask));
    line("", "  " + "WILDCARD".padEnd(12) + f((~mask) >>> 0));
    line("", "  " + "NETWORK".padEnd(12) + f(net));
    line("", "  " + "BROADCAST".padEnd(12) + f(bcast));
    line("", "  " + "FIRST HOST".padEnd(12) + (cidr < 31 ? f((net + 1) >>> 0) : "—"));
    line("", "  " + "LAST HOST".padEnd(12) + (cidr < 31 ? f((bcast - 1) >>> 0) : "—"));
    line("", "  " + "USABLE HOSTS".padEnd(12) + hosts);
    line("warn", "[!] Classless math — real IP addressing (public IPv4 limited resource, isi liye subnetting zaroori).");
    success();
  }

  // ── PORTS database (IANA well-known ports) ──
  const PORT_DB = [
    [20, "TCP", "FTP-DATA", "File Transfer (data channel)"],
    [21, "TCP", "FTP", "File Transfer (control)"],
    [22, "TCP", "SSH", "Secure Shell — remote admin"],
    [23, "TCP", "TELNET", "Insecure remote shell (plaintext!)"],
    [25, "TCP", "SMTP", "Email sending (plaintext)"],
    [53, "UDP/TCP", "DNS", "Domain Name System"],
    [67, "UDP", "DHCP", "Dynamic IP assignment"],
    [69, "UDP", "TFTP", "Trivial File Transfer"],
    [80, "TCP", "HTTP", "Web (plaintext)"],
    [110, "TCP", "POP3", "Email retrieval"],
    [123, "UDP", "NTP", "Time sync"],
    [135, "TCP", "MSRPC", "Windows RPC"],
    [137, "UDP", "NETBIOS", "Name service (legacy)"],
    [139, "TCP", "NETBIOS-SSN", "NetBIOS session (legacy)"],
    [143, "TCP", "IMAP", "Email retrieval (folders)"],
    [161, "UDP", "SNMP", "Network monitoring (v1/v2 plaintext!)"],
    [389, "TCP", "LDAP", "Directory services"],
    [443, "TCP", "HTTPS", "Secure web"],
    [445, "TCP", "SMB", "Windows file sharing"],
    [465, "TCP", "SMTPS", "SMTP over TLS"],
    [514, "TCP", "SYSLOG", "System logging"],
    [587, "TCP", "SUBMISSION", "SMTP with auth"],
    [636, "TCP", "LDAPS", "LDAP over TLS"],
    [873, "TCP", "RSYNC", "File sync (misconfig = leak)"],
    [993, "TCP", "IMAPS", "IMAP over TLS"],
    [995, "TCP", "POP3S", "POP3 over TLS"],
    [1080, "TCP", "SOCKS", "Proxy"],
    [1433, "TCP", "MSSQL", "Microsoft SQL Server"],
    [1521, "TCP", "ORACLE", "Oracle DB"],
    [2049, "TCP", "NFS", "Network File System"],
    [2375, "TCP", "DOCKER", "Docker API (no TLS = RCE risk)"],
    [3000, "TCP", "DEV-HTTP", "Dev servers / Grafana / Node"],
    [3306, "TCP", "MYSQL", "MySQL / MariaDB"],
    [3389, "TCP", "RDP", "Windows Remote Desktop"],
    [5060, "UDP/TCP", "SIP", "VoIP signaling"],
    [5432, "TCP", "POSTGRES", "PostgreSQL"],
    [5900, "TCP", "VNC", "Remote desktop (RFB)"],
    [5985, "TCP", "WINRM", "Windows Remote Management"],
    [6379, "TCP", "REDIS", "Redis (no auth = RCE risk)"],
    [8080, "TCP", "HTTP-ALT", "Common web/proxy port"],
    [8443, "TCP", "HTTPS-ALT", "Common secure web port"],
    [8888, "TCP", "HTTP-ALT2", "Jupyter / dev dashboards"],
    [9090, "TCP", "PROMETHEUS", "Metrics dashboard"],
    [9200, "TCP", "ELASTIC", "Elasticsearch (no auth = leak)"],
    [11211, "TCP", "MEMCACHED", "Memcached (amplification risk)"],
    [27017, "TCP", "MONGODB", "MongoDB (no auth = leak)"]
  ];

  function ports(tok) {
    const input = inputEl.value.trim();
    if (!input) {
      line("dim", "[>] Well-known ports (IANA) — reference database (Linux: /etc/services)");
      PORT_DB.forEach(p => line("", "  " + String(p[0]).padEnd(7) + String(p[1]).padEnd(6) + p[2].padEnd(14) + p[3]));
      line("warn", "[!] Open port = service running — enumeration ka pehla step. Sirf apne systems par.");
      success();
      return;
    }
    const num = parseInt(input, 10);
    const q = input.toLowerCase();
    const matches = PORT_DB.filter(p => p[0] === num || p[2].toLowerCase().indexOf(q) !== -1 || p[3].toLowerCase().indexOf(q) !== -1);
    if (!matches.length) { line("warn", "  Koi match nahi — 1-65535 ke beech port number ya service name daalo (e.g. ssh, mysql, 443)."); }
    matches.forEach(p => line("", "  " + String(p[0]).padEnd(7) + String(p[1]).padEnd(6) + p[2].padEnd(14) + p[3]));
    line("warn", "[!] Port DB = static reference (IANA). Live check ke liye PORTSCAN tool (authorized targets).");
    success();
  }

  // ── MAC generator / OUI vendor lookup ──
  function macgen(tok) {
    (async () => {
      const input = inputEl.value.trim();
      const mk = () => {
        const b = new Uint8Array(6);
        crypto.getRandomValues(b);
        b[0] = (b[0] & 0xFE) | 0x02;  // locally-administered, unicast
        return [...b].map(x => x.toString(16).padStart(2, "0")).join(":");
      };
      if (input) {
        const clean = input.replace(/[-:.]/g, "").toLowerCase();
        if (!/^[0-9a-f]{12}$/.test(clean)) { line("err", "[!] Invalid MAC — e.g. 00:11:22:33:44:55"); buzz(); return; }
        const oui = clean.slice(0, 6);
        line("dim", "[>] MAC vendor (OUI) lookup: " + input + " — public MAC registry (macvendors.com)");
        try {
          const txt = await proxyGet("https://api.macvendors.com/" + oui);
          line("ok", "  VENDOR: " + txt.trim());
        } catch (e) {
          line("warn", "[!] Vendor lookup failed (" + e.message + ") — OUI apne aap bhi check kar sakte ho.");
        }
        line("warn", "[!] MAC lookup = public registry data. MAC spoofing sirf apne devices par legal (privacy testing) — kisi aur ke network par nahi.");
        success();
        return;
      }
      line("dim", "[>] Generating random MACs — CSPRNG (locally-administered bit set)");
      line("ok", "══ RANDOM MACs ══");
      for (let i = 0; i < 5; i++) line("", "  " + mk());
      line("warn", "[!] Real random — network adapter change/practice ke liye (Linux: macchanger). Dhyan rahe: spoofing sirf apne devices par legal.");
      success();
    })().catch(() => {});
  }

  /* ═══════════ PRIVACY — real privacy tools ═══════════ */

  // REAL: WebRTC local-IP leak detection (STUN candidates)
  function webRtcLeak() {
    return new Promise(resolve => {
      const found = { ips: [], mdns: [] };
      let pc = null;
      let timer = null;
      let done = false;
      const cleanup = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { if (pc) pc.close(); } catch (e) { /* noop */ }
        resolve(found);
      };
      try {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }]
        });
        pc.createDataChannel("probe");
        pc.onicecandidate = (e) => {
          if (!e.candidate) { cleanup(); return; }
          const cand = e.candidate.candidate || "";
          const m = cand.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
          if (m && found.ips.indexOf(m[1]) === -1) found.ips.push(m[1]);
          const h = cand.match(/[a-z0-9-]+\.local/i);
          if (h && found.mdns.indexOf(h[0]) === -1) found.mdns.push(h[0]);
        };
        pc.createOffer().then(o => pc.setLocalDescription(o)).catch(cleanup);
        timer = setTimeout(cleanup, 3000);
      } catch (e) { cleanup(); }
    });
  }

  // REAL: privacy leak test
  function leaktest(tok) {
    (async () => {
      line("ok", "══ PRIVACY LEAK TEST ══");
      line("dim", "[>] Checking WebRTC local-IP leaks + location exposure… (real browser APIs)");
      const found = await webRtcLeak();
      if (tok !== runToken) return;
      if (found.ips.length) {
        const priv = found.ips.filter(ip => /^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
        const pub = found.ips.filter(ip => !/^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
        line("err", "[!] WEBRTC IP LEAK DETECTED:");
        found.ips.forEach(ip => line("err", "    → " + ip));
        if (priv.length) line("err", "[!] LOCAL IP leak — sites aapka internal network IP dekh sakti hain (sabse dangerous).");
        if (pub.length) line("warn", "[!] PUBLIC IP via STUN — wahi IP jo sites waise bhi dekhti hain; real VPN isse hide karega.");
        line("warn", "[!] Fix: browser mein WebRTC disable karo ya real VPN use karo (VPN_GUIDE).");
      } else if (found.mdns.length) {
        line("ok", "[✓] WebRTC local IP protected — mDNS obfuscation active (" + found.mdns[0] + "). Chrome by-default ab private hai.");
      } else {
        line("ok", "[✓] Koi WebRTC local-IP leak nahi mila (protected/unsupported).");
      }
      try {
        const st = await navigator.permissions.query({ name: "geolocation" });
        const stTxt = String(st.state).toUpperCase();
        line("", "  GEOLOCATION PERMISSION: " + stTxt + (stTxt === "GRANTED" ? " — sites aapki location maang sakti hain!" : (stTxt === "PROMPT" ? " — site maangegi toh popup aayega" : " — location sites ko nahi mil sakti (bina permission)")));
      } catch (e) {
        line("dim", "  GEOLOCATION PERMISSION: unknown (browser restriction)");
      }
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        if (res.ok) {
          const d = await res.json();
          line("", "  PUBLIC IP (VPN ke bina sites ko dikhta): " + d.ip);
        }
      } catch (e) { /* noop */ }
      line("", "  FINGERPRINT SURFACE: " + String(navigator.userAgent || "?").slice(0, 58) + "…");
      line("", " ");
      line("ok", "══ RESULT ══");
      line(found.ips.length ? "err" : "ok", found.ips.length
        ? "LEAK DETECTED — action lo (real VPN / WebRTC off)."
        : "NO LOCAL-IP LEAK — par public IP abhi bhi visible hai bina VPN.");
      line("warn", "[!] Real diagnostic — LEAK_TEST sirf batata hai; real protection ke liye VPN_GUIDE tool dekho.");
      success();
    })().catch(() => {});
  }

  // REAL: VPN / proxy check — real public IP intel + WebRTC + browser connection data
  // Koi fake number nahi: har value aapke real connection se aati hai. Analysis = honest pattern-match on real ASN/ISP.
  function vpn(tok) {
    (async () => {
      line("ok", "══ VPN / PROXY CHECK ══");
      line("dim", "[>] Real data: public IP (ipify), IP intel (ipwho.is), WebRTC candidates, browser connection API.");
      // 1) real public IP
      let ip = null;
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        if (r.ok) { const d = await r.json(); ip = d.ip || null; }
      } catch (e) { /* noop */ }
      if (!ip) { line("err", "[!] IP fetch fail — internet check karo."); buzz(); return; }
      if (tok !== runToken) return;
      line("", "  PUBLIC IP  : " + ip);
      // 2) real IP intel (ipwho.is)
      let info = null;
      try {
        const w = await fetch("https://ipwho.is/" + encodeURIComponent(ip));
        if (w.ok) info = await w.json();
      } catch (e) { /* noop */ }
      if (tok !== runToken) return;
      if (info && info.success !== false) {
        line("", "  LOCATION   : " + [info.city, info.region, info.country].filter(Boolean).join(", "));
        const c = info.connection || {};
        if (c.org || c.isp) line("", "  ISP/ASN    : " + String(c.org || c.isp) + (c.asn ? " (AS" + c.asn + ")" : ""));
        if (c.domain) line("", "  DOMAIN     : " + c.domain);
      } else {
        line("", "  LOCATION   : lookup fail");
      }
      // 3) real WebRTC candidates
      const wb = await webRtcLeak();
      if (tok !== runToken) return;
      const priv = (wb.ips || []).filter(p => /^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/.test(p));
      line("", "  WEBRTC     : " + (wb.ips.length ? wb.ips.join(" · ") : (wb.mdns.length ? "protected (mDNS: " + wb.mdns[0] + ")" : "koi candidate nahi")));
      // 4) real browser connection info
      const nc = navigator.connection || null;
      if (nc) {
        line("", "  LINK       : " + (typeof nc.downlink === "number" ? nc.downlink + " Mbps" : "?") + (typeof nc.rtt === "number" ? " · RTT " + nc.rtt + " ms" : "") + (nc.effectiveType ? " · " + String(nc.effectiveType).toUpperCase() : ""));
      }
      // 5) honest analysis — pattern matching on REAL ASN/ISP/domain data (estimate, browser se 100% confirm nahi)
      line("", " ");
      line("ok", "══ ANALYSIS (real ASN/ISP data par pattern matching — estimate) ══");
      const conn = (info && info.connection) || {};
      const hay = String(conn.org || conn.isp || "").toLowerCase() + " " + String(conn.domain || "").toLowerCase();
      const VPN_KW = ["vpn", "mullvad", "nordvpn", "private internet access", "pia", "proton", "windscribe", "surfshark", "expressvpn", "ivacy", "cyberghost", "tor", "onion", "anonym", "datacenter", "hosting", "cloud", "ovh", "digitalocean", "hetzner", "linode", "vultr", "scaleway", "leaseweb", "amazon", "aws", "google cloud", "azure"];
      const hits = VPN_KW.filter(k => hay.includes(k));
      if (hits.length) {
        line("warn", "  • ISP/ASN '" + hits.join("', '") + "' — VPN/datacenter jaisa pattern mila (real data se)");
      } else {
        line("warn", "  • ISP/ASN me koi VPN/proxy/datacenter pattern nahi mila — aapka connection normal ISP jaisa hai");
      }
      if (priv.length) line("err", "  • WebRTC se LOCAL IP leak — sites aapka internal network dekh sakti hain (VPN bhi isse bina config fix nahi karta)");
      line("warn", "[!] Sach: browser se VPN 100% confirm NAHI hota. Yeh check sirf real data par honest estimate hai. Confirm: VPN_GUIDE se real VPN connect karo → MYIP / LEAK_TEST se verify. Koi fake number nahi — sab aapke asli connection se.");
      success();
    })().catch(() => {});
  }

  // REAL: setup guide with trustworthy services
  function vpnguide(tok) {
    line("ok", "══ REAL VPN SETUP GUIDE ══");
    line("dim", "[>] Browser se asli VPN nahi chalta — real privacy ke liye ek app install karni padti hai. Trustworthy options:");
    line("", " ");
    line("", "  1. PROTON VPN   — protonvpn.com");
    line("", "     Free tier (unlimited data, 3 countries) + Windows app. No-logs (audited), Switzerland.");
    line("", "  2. MULLVAD      — mullvad.net");
    line("", "     ~€5/month flat. Koi email/account nahi — sirf account number. No-logs (audited).");
    line("", "  3. TOR BROWSER  — torproject.org");
    line("", "     Free, anonymous onion routing. Firefox-based; WebRTC off by default. Slow but strongest anonymity.");
    line("", " ");
    line("warn", "[!] VPN bhi perfect nahi: (1) Browser ke WebRTC se LOCAL IP leak ho sakta hai — pehle LEAK_TEST chalao. (2) Free VPNs jo logs rakhte hain unse bacho. (3) Location 'har second' real me nahi badalti — VPN pe exit country change hota hai; wahi real privacy ke liye kaafi hai.");
    line("warn", "[!] Steps: app install karo → country/server choose karo → connect → LEAK_TEST se verify karo → browser mein WebRTC disable karo (chrome://flags ya extension).");
    success();
  }

  /* ═══════════ INFO — real public-data tools ═══════════ */

  // ── NEWS (real — Google News RSS) ──
  function news(tok) {
    (async () => {
      line("dim", "[>] Top headlines — Google News RSS (real, public)");
      try {
        const txt = await proxyGet("https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en");
        const doc = new DOMParser().parseFromString(txt, "text/xml");
        const items = [...doc.querySelectorAll("item")].slice(0, 10);
        if (!items.length) throw new Error("no headlines");
        if (tok !== runToken) return;
        line("ok", "══ TOP HEADLINES (Google News) ══");
        items.forEach((it, i) => {
          const t = (it.querySelector("title") || {}).textContent || "";
          line("", (i + 1) + ". " + t);
        });
        line("warn", "[!] Real Google News RSS — latest headlines, 100% legal public feed.");
        success();
      } catch (e) {
        line("err", "[!] News failed: " + e.message + " — internet check karo.");
        buzz();
      }
    })().catch(() => {});
  }

  // ── WIKI (real — Wikipedia search + intro) ──
  function wiki(tok) {
    (async () => {
      const q = inputEl.value.trim();
      if (!q) { line("err", "[!] Topic daalo — e.g. wiki artificial intelligence"); buzz(); return; }
      line("dim", "[>] Wikipedia search: " + q + " (public encyclopedia API)");
      try {
        const res = await fetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(q) + "&format=json&origin=*&srlimit=3");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const d = await res.json();
        const hits = (d.query && d.query.search) || [];
        if (!hits.length) { line("warn", "  Koi result nahi mila — spelling check karo."); }
        for (const h of hits.slice(0, 2)) {
          if (tok !== runToken) return;
          const pageRes = await fetch("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&format=json&origin=*&titles=" + encodeURIComponent(h.title) + "&exchars=500");
          const pd = await pageRes.json();
          const pages = (pd.query && pd.query.pages) || {};
          const p = pages[Object.keys(pages)[0]];
          line("", " ");
          line("ok", "◆ " + h.title);
          line("", "  " + String(p.extract || "No intro available").slice(0, 400));
        }
        if (tok !== runToken) return;
        line("", " ");
        line("ok", "══ WIKIPEDIA — real ══");
        line("warn", "[!] Public encyclopedia — koi bhi topic ka intro, 100% legal.");
        success();
      } catch (e) {
        line("err", "[!] Wiki failed: " + e.message);
        buzz();
      }
    })().catch(() => {});
  }

  /* ═══════════ SPOTIFY — real music search & playlists (free plan friendly) ═══════════ */

  // REAL: Spotify search + playlists + open-in-app (PKCE auth, window.SPOTIFY se)
  function spotify(tok) {
    (async () => {
      if (!window.SPOTIFY) { line("err", "[!] SPOTIFY module load nahi hua — page refresh karo."); buzz(); return; }
      if (!window.SPOTIFY.isConnected()) {
        line("warn", "[!] Spotify connected nahi hai.");
        line("", "    Setup (2 min, free):");
        line("", "    1. developer.spotify.com → Dashboard → Create App");
        line("", "    2. Redirect URI: " + window.SPOTIFY.getRedirectUri());
        line("", "    3. Client ID copy karo → Settings → Spotify mein paste karo");
        line("", "    4. CONNECT dabao — phir yahan search karo!");
        buzz();
        return;
      }
      const q = inputEl.value.trim();
      line("dim", "[>] Spotify — real API se (no secret, PKCE auth)");
      try {
        if (q && /playlists/i.test(q)) {
          line("dim", "[>] Fetching your playlists…");
          const pls = await window.SPOTIFY.myPlaylists(20);
          if (tok !== runToken) return;
          if (!pls.length) { line("warn", "  Koi playlist nahi mili."); }
          else {
            line("ok", "══ YOUR PLAYLISTS (" + pls.length + ") ══");
            pls.forEach((p, i) => {
              if (i >= 12) return;
              line("", "  " + (i + 1) + ". " + p.name + "  (" + (p.tracks ? p.tracks.total : "?") + " tracks)");
              const a = document.createElement("a");
              a.className = "spot-link";
              a.href = p.external_urls && p.external_urls.spotify;
              a.target = "_blank";
              a.rel = "noopener";
              a.textContent = "  [ open in spotify ]";
              output.appendChild(a);
            });
          }
        } else {
          const query = q || "";
          if (!query) { line("warn", "  Kya search karun, sir? Kuch type karo (song / artist)."); return; }
          line("dim", "[>] Searching: \"" + query + "\" — /v1/search (real)");
          const tracks = await window.SPOTIFY.search(query, 8);
          if (tok !== runToken) return;
          if (!tracks.length) { line("warn", "  Koi track nahi mila — spelling check karo."); }
          else {
            line("ok", "══ TRACKS ══");
            tracks.forEach((t, i) => {
              if (tok !== runToken) return;
              const arts = (t.artists || []).map(a => a.name).join(", ");
              line("", "  " + (i + 1) + ". " + t.name + " — " + arts + "  [" + (t.album ? t.album.name : "") + "]");
              const a = document.createElement("a");
              a.className = "spot-link";
              a.href = t.external_urls && t.external_urls.spotify;
              a.target = "_blank";
              a.rel = "noopener";
              a.textContent = "  [ open in spotify ]";
              output.appendChild(a);
            });
          }
        }
        if (tok !== runToken) return;
        line("", " ");
        line("ok", "══ SPOTIFY — real ══");
        line("warn", "[!] Free plan: open link → Spotify app khul jata hai. Premium ho toh Player API se direct playback bhi possible hai ('play <song> on spotify' abhi bhi kaam karta hai).");
        success();
      } catch (e) {
        line("err", "[!] Spotify error: " + (e.message || e));
        buzz();
      }
    })().catch(() => {});
  }

  /* ─── registry ─── */
  const TOOLS = {
    dns:      { title: "DNS_LOOKUP.exe",    cat: "RECON",  needInput: true,  placeholder: "hostname… (e.g. example.com)",       prefill: "example.com",        run: dns },
    revdns:   { title: "REVDNS.exe",        cat: "RECON",  needInput: true,  placeholder: "IP… (e.g. 8.8.8.8)",                 prefill: "8.8.8.8",            run: revdns },
    whois:    { title: "WHOIS.exe",         cat: "RECON",  needInput: true,  placeholder: "domain… (e.g. example.com)",         prefill: "example.com",        run: whois },
    subenum:  { title: "SUBDOMAIN.exe",     cat: "RECON",  needInput: true,  placeholder: "domain… (e.g. example.com)",         prefill: "example.com",        run: subenum },
    portscan: { title: "PORTSCAN.exe",      cat: "RECON",  needInput: true,  placeholder: "host… (sirf authorized)",            prefill: "scanme.nmap.org",    run: portscan },
    trace:    { title: "TRACEROUTE.exe",    cat: "RECON",  needInput: true,  placeholder: "host… (e.g. example.com)",           prefill: "example.com",        run: trace },
    ping:     { title: "PING.exe",          cat: "RECON",  needInput: true,  placeholder: "host… (e.g. example.com)",           prefill: "example.com",        run: ping },
    cert:     { title: "CERTIFICATES.exe",  cat: "RECON",  needInput: true,  placeholder: "domain… (e.g. example.com)",         prefill: "example.com",        run: cert },
    probe:    { title: "HTTP_PROBE.exe",    cat: "RECON",  needInput: true,  placeholder: "url… (e.g. https://example.com)",     prefill: "https://example.com", run: probe },
    geoip:    { title: "GEOIP.exe",         cat: "OSINT",  needInput: true,  placeholder: "IP (empty = aapka IP)",              prefill: "",                   run: geoip },
    github:   { title: "GITHUB.exe",        cat: "OSINT",  needInput: true,  placeholder: "username…",                           prefill: "",                   run: github },
    myip:     { title: "MYIP.exe",          cat: "OSINT",  needInput: false, run: myip },
    recon:    { title: "SYSTEM_RECON.exe",  cat: "OSINT",  needInput: false, run: recon },
    arsenal:  { title: "ARSENAL.exe",       cat: "OSINT",  needInput: true,  placeholder: "filter… (e.g. nmap / wifi / web)",   prefill: "",                   run: arsenal },
    hash:     { title: "HASH.exe",          cat: "CRYPTO", needInput: true,  placeholder: "text to hash…",                      prefill: "hello world",        run: hash },
    crypto:   { title: "CRYPTO.exe",        cat: "CRYPTO", needInput: true,  placeholder: "message… ya  CIPHER|KEY",            prefill: "hello world",        run: crypto },
    base64:   { title: "BASE64.exe",        cat: "CRYPTO", needInput: true,  placeholder: "text to encode / base64 to decode",  prefill: "hello world",        run: base64 },
    hex:      { title: "HEX.exe",           cat: "CRYPTO", needInput: true,  placeholder: "text to hex / hex to text",          prefill: "hello world",        run: hex },
    rot13:    { title: "ROT.exe",           cat: "CRYPTO", needInput: true,  placeholder: "text… ya  shift text (default 13)",  prefill: "hello world",        run: rot13 },
    urlcode:  { title: "URLCODE.exe",       cat: "CRYPTO", needInput: true,  placeholder: "text with special chars…",          prefill: "hello world & more!", run: urlcode },
    hashid:   { title: "HASHID.exe",        cat: "CRYPTO", needInput: true,  placeholder: "hash/digest paste karo…",            prefill: "",                   run: hashid },
    passwd:   { title: "PASSWORD.exe",      cat: "CRYPTO", needInput: true,  placeholder: "password check… (empty = generate)", prefill: "",                   run: passwd },
    subnet:   { title: "SUBNET.exe",        cat: "NET",    needInput: true,  placeholder: "CIDR… (e.g. 192.168.1.0/24)",        prefill: "192.168.1.0/24",     run: subnet },
    ports:    { title: "PORTS.exe",         cat: "NET",    needInput: true,  placeholder: "port no. ya service (empty = list)",  prefill: "",                   run: ports },
    macgen:   { title: "MACGEN.exe",        cat: "NET",    needInput: true,  placeholder: "MAC lookup… (empty = random gen)",    prefill: "",                   run: macgen },
    vpn:      { title: "VPN_CHECK.exe",     cat: "PRIVACY",   needInput: false, sim: false, run: vpn },
    leaktest: { title: "LEAK_TEST.exe",     cat: "PRIVACY",   needInput: false, sim: false, run: leaktest },
    vpnguide: { title: "VPN_GUIDE.exe",     cat: "PRIVACY",   needInput: false, sim: false, run: vpnguide },
    news:     { title: "NEWS.exe",          cat: "INFO",     needInput: false, sim: false, run: news },
    wiki:     { title: "WIKI.exe",          cat: "INFO",     needInput: true,  placeholder: "topic… (e.g. artificial intelligence)", prefill: "", run: wiki },
    spotify:  { title: "SPOTIFY.exe",       cat: "MUSIC",    needInput: true,  placeholder: "song / artist… ya 'playlists'",       prefill: "",                 run: spotify }
  };

  /* ─── toolbar wiring ─── */
  document.querySelectorAll(".tool-btn").forEach(btn => {
    btn.addEventListener("click", () => launch(btn.dataset.tool));
  });

  /* ─── voice/text command matcher (most specific first) ─── */
  const TOOL_COMMANDS = [
    { id: "spotify", re: /\bspotify\s+search\s+(.+)/i, param: (m) => m[1] },
    { id: "spotify", re: /\bspotify\s+(?:tool|playlists|playlist)\b|\b(?:my|show\s+my)\s+playlists?\b/i, param: () => "playlists" },
    { id: "vpnguide", re: /\b(?:vpn\s*guide|best\s*vpn|real\s*vpn|how\s*to\s*(?:hide|be\s*anonymous)|anonymity)\b/i, param: () => undefined },
    { id: "vpn",      re: /\b(?:vpn|am\s+i\s+on\s+a\s+vpn|proxy\s*check|privacy\s*status)\b/i,      param: () => undefined },
    { id: "leaktest", re: /\b(?:leak\s*test|webrtc|privacy\s*check|ip\s*leak|am\s*i\s*leaking)\b/i, param: () => undefined },
    { id: "news",     re: /\b(?:news|headlines|khabar|aaj\s*ki\s*khabar)\b/i,                   param: () => undefined },
    { id: "wiki",     re: /\b(?:wiki|wikipedia|wikipedia\s*search)\b\s*(.+)/i,                param: (m) => m[1] },
    { id: "portscan", re: /\b(?:port\s*scan|scan\s*(?:the\s*)?ports?|nmap)\b\s*(.+)/i,            param: (m) => m[1] },
    { id: "revdns",   re: /\breverse\s*dns\b\s*(.+)|ptr\s*(?:lookup)?\s*(.+)/i,                   param: (m) => m[1] || m[2] },
    { id: "subenum",  re: /\b(?:subdomain|subdomains?|enumerate\s*(?:the\s*)?subdomains?|host\s*search)\b\s*(.+)/i, param: (m) => m[1] },
    { id: "trace",    re: /\btrace\s*route\b\s*(.+)|traceroute\s*(.+)/i,                          param: (m) => m[1] || m[2] },
    { id: "whois",    re: /\bwhois\b\s*(.+)/i,                                                   param: (m) => m[1] },
    { id: "dns",      re: /\bdns\b(?:lookup|query)?\s*(.+)|resolve\s+(.+)|lookup\s+(.+)/i,        param: (m) => m[1] || m[2] || m[3] },
    { id: "cert",     re: /\b(?:ssl\s*)?certs?\b\s*(.+)|certificate\s*(?:check|lookup)?\s*(.+)/i, param: (m) => m[1] || m[2] },
    { id: "ping",     re: /\bping\b\s*(.+)/i,                                                    param: (m) => m[1] },
    { id: "probe",    re: /http\s*probe\s*(.+)|security\s*headers\s*(.+)|probe\s+(.+)|check\s*(?:the\s*)?(?:site|url)\s*(.+)/i, param: (m) => m[1] || m[2] || m[3] || m[4] },
    { id: "myip",     re: /\bmy\s*ip\b|what\s*is\s*my\s*ip|public\s*ip\b/i,                       param: () => undefined },
    { id: "geoip",    re: /\bgeo\s*ip\b\s*(.+)|geoip\s*(.+)|ip\s*(?:location|info)\s*(.+)/i,      param: (m) => m[1] || m[2] || m[3] },
    { id: "github",   re: /\bgithub\b\s*(.+)/i,                                                 param: (m) => m[1] },
    { id: "arsenal",  re: /\b(?:arsenal|kali\s*tools|tool(?:s|kit)?\s*list|linux\s*tools)\b/i,    param: () => undefined },
    { id: "hashid",   re: /\bhash\s*(?:id|type|identifier|detect|identify)\b\s*(.+)|identify\s*hash\s*(.+)/i, param: (m) => m[1] || m[2] },
    { id: "hash",     re: /\bhash\b\s*(.+)|sha\s*-?\d*\s*(.+)/i,                                 param: (m) => m[1] || m[2] },
    { id: "base64",   re: /\bbase64\b\s*(.+)/i,                                                  param: (m) => m[1] },
    { id: "hex",      re: /\bhex\b\s*(.+)|encode\s*hex\s*(.+)/i,                                 param: (m) => m[1] || m[2] },
    { id: "rot13",    re: /\b(?:rot\s*-?\d*|caesar|rot13)\b\s*(.+)/i,                            param: (m) => m[1] },
    { id: "urlcode",  re: /\burl\s*(?:encode|decode|code)?\s*(.+)/i,                             param: (m) => m[1] },
    { id: "crypto",   re: /\bcrypto\b(?:\s+(.+))?|\baes\b(?:\s+(.+))?|cipher\s+(.+)|(?:en|de)crypt\s+(.+)/i, param: (m) => m[1] || m[2] || m[3] || m[4] },
    { id: "passwd",   re: /\bpassword\b(?:\s+(.+))?|passphrase\s+(.+)|strong\s*password/i,       param: (m) => m[1] || m[2] },
    { id: "subnet",   re: /\bsubnet\b\s*(.+)|subnet\s*calc\s*(.+)|cidr\s*(.+)/i,                 param: (m) => m[1] || m[2] || m[3] },
    { id: "ports",    re: /\bports?\s*(?:lookup|database)?\s*(.+)|what\s*port\s*(?:is|for)\s*(.+)|service\s*lookup\s*(.+)/i, param: (m) => m[1] || m[2] || m[3] },
    { id: "macgen",   re: /\bmac\s*(?:address|gen(?:erate)?|lookup)?\s*(.+)|random\s*mac\s*(.+)/i, param: (m) => m[1] || m[2] },
    { id: "recon",    re: /(system\s*)?recon|system\s*(info|fingerprint)/i,                     param: () => undefined }
  ];

  function matchTool(text) {
    for (const c of TOOL_COMMANDS) {
      const m = text.match(c.re);
      if (m) return { id: c.id, match: m, param: c.param ? c.param(m) : undefined };
    }
    return null;
  }

  /* ─── public API ─── */
  return {
    matchTool,
    launch,
    close: closeModal,
    unlock,
    setSound: (on) => { soundOn = !!on; },
    beep
  };
})();
