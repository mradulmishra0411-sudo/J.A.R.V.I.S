/* ═══════════════════════════════════════════════════════
   J.A.R.V.I.S v2 — LOCAL MEMORY LEARNING
   Galtiyon se seekhna (honest version):
   - Corrections ko localStorage mein yaad rakhta hai
   - Similar baat dobara aane par system-prompt mein inject karta hai
   - Errors ka track rakhta hai (model failures) — pattern recall
   Ye REAL machine-learning NAHI hai — yeh retrieval-based memory hai.
   🧠
   ═══════════════════════════════════════════════════════ */
"use strict";

window.LEARN = (function () {

  const LS_LEARN = "jarvis_learn_v1";
  const LS_ERR   = "jarvis_errors_v1";
  const LS_FLAG  = "jarvis_learn_enabled";
  const MAX_LESSONS = 200;
  const MAX_ERRORS  = 60;

  const STOP = new Set([
    "hai", "hain", "ka", "ki", "ke", "ko", "se", "par", "mein", "me", "aur", "ya", "to",
    "yeh", "ye", "wo", "woh", "voh", "mujhe", "tum", "tumhe", "aap", "apna", "apni", "apne",
    "mera", "meri", "mere", "the", "tha", "thi", "is", "us", "bhi", "nahi", "na", "kya",
    "ab", "phir", "ho", "hoga", "hogaya", "karo", "karta", "karti", "raha", "rah", "aur",
    "and", "the", "a", "an", "of", "to", "in", "on", "for", "with", "my", "you", "your",
    "i", "me", "it", "is", "was", "are", "do", "did", "can", "will", "please", "sir", "boss"
  ]);

  function load(key, def) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v === null || v === undefined ? def : v;
    } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* noop */ }
  }

  function words(s) {
    return String(s || "").toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w));
  }

  let lessons = load(LS_LEARN, []);
  let errors  = load(LS_ERR, []);

  function enabled() {
    return localStorage.getItem(LS_FLAG) !== "off";
  }
  function setEnabled(on) {
    try { localStorage.setItem(LS_FLAG, on ? "on" : "off"); } catch (e) { /* noop */ }
  }

  /* ── lessons ── */
  function addLesson(subject, correction) {
    if (!enabled()) return 0;
    const s = String(subject || "").slice(0, 60);
    const c = String(correction || "").slice(0, 200);
    if (!c.trim()) return lessons.length;
    // dedupe (same subject + correction)
    if (lessons.some(l => l.s === s && l.c === c)) return lessons.length;
    lessons.push({ s: s, c: c, t: Date.now() });
    if (lessons.length > MAX_LESSONS) lessons = lessons.slice(lessons.length - MAX_LESSONS);
    save(LS_LEARN, lessons);
    return lessons.length;
  }

  function recall(text) {
    if (!enabled() || !lessons.length) return "";
    const w = words(text);
    if (!w.length) return "";
    const hits = lessons
      .map(l => ({ l, score: words(l.s + " " + l.c).filter(x => w.includes(x)).length }))
      .filter(h => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (!hits.length) return "";
    return hits.map(h => "• " + (h.l.s ? h.l.s + " → " : "") + h.l.c).join("\n");
  }

  function list() {
    if (!lessons.length) return "";
    return lessons.slice(-8).reverse().map((l, i) => (i + 1) + ". " + (l.s ? "[" + l.s + "] " : "") + l.c).join("\n");
  }

  function count() { return lessons.length; }

  /* ── errors ── */
  function addError(ctx, msg) {
    errors.push({ ctx: String(ctx || "?").slice(0, 40), msg: String(msg || "").slice(0, 100), t: Date.now() });
    if (errors.length > MAX_ERRORS) errors = errors.slice(errors.length - MAX_ERRORS);
    save(LS_ERR, errors);
  }

  function failCount(ctx) {
    const c = String(ctx || "");
    return errors.filter(e => e.ctx === c).length;
  }

  function stats() {
    return { lessons: lessons.length, errors: errors.length };
  }

  function wipe() {
    lessons = [];
    errors = [];
    save(LS_LEARN, lessons);
    save(LS_ERR, errors);
  }

  return {
    enabled, setEnabled,
    addLesson, recall, list, count,
    addError, failCount, stats, wipe
  };
})();
