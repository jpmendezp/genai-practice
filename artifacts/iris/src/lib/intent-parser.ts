/* Pure intent parsing + model-response validation. No React, no network imports. */

export type Goal = "cancel" | "switch" | "unclear";
export interface ParsedIntent {
  goal: Goal;
  fromCarrier: string | null;
  toCarrier: string | null;
  keepNumber: boolean | null;
  confidence: "high" | "low";
  restatement: string | null;
}
export interface ModelIntent {
  goal: Goal; fromCarrier: string | null; toCarrier: string | null; keepNumber: boolean | null;
  confidence: "high" | "low"; restatement: string;
}
export type UnderstandFn = (input: { message: string }, options?: { signal?: AbortSignal }) => Promise<unknown>;

/* ---------- carriers ---------- */
// Order matters: named MVNOs claim their spans before the big-three patterns run.
const PATTERNS: [RegExp, string][] = [
  [/\bmetro\s*(?:by\s*)?t[\s-]?mobile\b|\bmetro\s*pcs\b|\bmetropcs\b|\bmetro\b/g, "Metro by T-Mobile"],
  [/\bmint(?:\s*mobile)?\b/g, "Mint Mobile"],
  [/\bcricket(?:\s*wireless)?\b/g, "Cricket"],
  [/\bvisible\b/g, "Visible"],
  [/\bboost(?:\s*mobile)?\b/g, "Boost Mobile"],
  [/\bgoogle\s*fi\b/g, "Google Fi"],
  [/\bus\s*cellular\b|\buscellular\b/g, "US Cellular"],
  [/\bxfinity(?:\s*mobile)?\b/g, "Xfinity Mobile"],
  [/\bspectrum(?:\s*mobile)?\b/g, "Spectrum Mobile"],
  [/\bstraight\s*talk\b/g, "Straight Talk"],
  [/\btracfone\b/g, "Tracfone"],
  [/\bconsumer\s*cellular\b/g, "Consumer Cellular"],
  [/\bus\s*mobile\b/g, "US Mobile"],
  [/\bverizon(?:\s*wireless)?\b|\bvzw?\b/g, "Verizon"],
  [/\bat\s?&\s?t\b|\bat\s?&\s?t(?=\W|$)|\batt\b|\bat and t\b/g, "AT&T"],
  [/\bt[\s-]?mobile\b|\btmobile\b/g, "T-Mobile"],
];
export const KNOWN_CARRIERS = Array.from(new Set(PATTERNS.map(([, n]) => n)));

export interface CarrierHit { name: string; start: number; end: number }
export function findCarriers(text: string): CarrierHit[] {
  const s = text.toLowerCase();
  const hits: CarrierHit[] = [];
  const overlaps = (a: number, b: number) => hits.some((h) => a < h.end && b > h.start);
  for (const [re, name] of PATTERNS) {
    re.lastIndex = 0;
    for (let m = re.exec(s); m; m = re.exec(s)) {
      const start = m.index, end = start + m[0].length;
      if (overlaps(start, end)) continue;
      if (name === "T-Mobile" && /(mint|metro|by)\s*$/.test(s.slice(Math.max(0, start - 8), start))) continue;
      hits.push({ name, start, end });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}
/** Canonical carrier from free text; null if nothing recognized. */
export function canonCarrier(t: string): string | null {
  const h = findCarriers(t)[0];
  if (h) return h.name;
  if (/\bother\b|someone else|different one|another/.test(t.toLowerCase())) return "Other";
  return null;
}

const TO_RE = /\b(to|for|into|onto|towards?|join(?:ing)?|over to|go with|sign up with)\b/g;
const FROM_RE = /\b(from|leave|leaving|left|off|quit|quitting|cancel|canceling|cancelling|ditch|ditching|out of|have|on|with|using|my|dump|drop)\b/g;
const lastIdx = (re: RegExp, s: string) => { re.lastIndex = 0; let i = -1; for (let m = re.exec(s); m; m = re.exec(s)) i = m.index; return i; };

/** Keyword parse of a free-text request, including two-carrier direction. */
export function parseIntent(text: string): ParsedIntent {
  const s = text.toLowerCase();
  const hits = findCarriers(s);
  let from: string | null = null, to: string | null = null;
  const undirected: string[] = [];
  let prevEnd = 0;
  for (const h of hits) {
    const win = s.slice(prevEnd, h.start);
    prevEnd = h.end;
    const t = lastIdx(TO_RE, win), f = lastIdx(FROM_RE, win);
    if (t > f && !to) to = h.name;
    else if (f > t && !from) from = h.name;
    else undirected.push(h.name);
  }
  for (const n of undirected) {
    if (n === from || n === to) continue;
    // Two names without direction are not enough to assign source/destination.
    if (hits.length === 1 && !from && !to) from = n;
  }
  if (from && to === from) to = null;
  if (!from && !hits.length && /\bother\b|another carrier|someone else/.test(s)) from = "Other";
  const switchWords = /switch|\bport|keep (my |the )?(phone )?number|transfer|\bmov(e|ing)\b|new carrier|\bchang(e|ing) carriers?/.test(s);
  const cancelWords = /cancel|\bquit|\bleave|\bleaving|close (my )?(account|line|plan)|end (my )?(plan|service)|get (me )?(out|off)|\bditch|\bdump/.test(s);
  const goal: Goal = switchWords || to ? "switch" : cancelWords ? "cancel" : "unclear";
  let keepNumber: boolean | null = null;
  if (/new number|don'?t (need|want|care about|keep) (my |the )?(phone )?number|(?:do not|not)\s+(?:want to\s+)?keep (my |the )?(phone )?number|fresh number/.test(s)) keepNumber = false;
  else if (/keep (my |the )?(phone )?number|\bport|transfer (my )?number|same number/.test(s)) keepNumber = true;
  return { goal, fromCarrier: from, toCarrier: goal === "switch" ? to : null, keepNumber, confidence: hits.length > 1 && (!from || !to) ? "low" : "high", restatement: null };
}

/* ---------- model validation ---------- */
const optCarrier = (v: unknown) => v === null || (typeof v === "string" && v.trim().length > 0 && v.length <= 80);
export function validateIntent(x: unknown): ModelIntent | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  for (const k of ["goal", "fromCarrier", "toCarrier", "keepNumber", "confidence", "restatement"]) if (!(k in o)) return null;
  if (o.goal !== "cancel" && o.goal !== "switch" && o.goal !== "unclear") return null;
  if (!optCarrier(o.fromCarrier) || !optCarrier(o.toCarrier)) return null;
  if (o.keepNumber !== null && typeof o.keepNumber !== "boolean") return null;
  if (o.confidence !== "high" && o.confidence !== "low") return null;
  if (typeof o.restatement !== "string" || !o.restatement.trim() || o.restatement.length > 240) return null;
  return {
    goal: o.goal, fromCarrier: o.fromCarrier as string | null, toCarrier: o.toCarrier as string | null,
    keepNumber: o.keepNumber as boolean | null, confidence: o.confidence, restatement: o.restatement.trim(),
  };
}

const normCarrier = (c: string | null) => (c ? canonCarrier(c) ?? c.trim() : null);
/** Turn a validated model response into the app's intent (canonical names, no destination on cancel). */
export function fromModel(m: ModelIntent): ParsedIntent {
  const from = normCarrier(m.fromCarrier);
  let to = m.goal === "switch" ? normCarrier(m.toCarrier) : null;
  if (to && to === from) to = null;
  return { goal: m.goal, fromCarrier: from, toCarrier: to, keepNumber: m.goal === "switch" ? m.keepNumber : null, confidence: m.confidence, restatement: m.restatement };
}

/** Call the model with a hard timeout. Resolves null on failure/timeout/invalid. Robust if fn ignores abort. */
export function understandWithTimeout(fn: UnderstandFn, message: string, ms = 6000) {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((r) => { timer = setTimeout(() => { ac.abort(); r(null); }, ms); });
  const aborted = new Promise<null>((r) => ac.signal.addEventListener("abort", () => r(null)));
  let call: Promise<unknown>;
  try { call = Promise.resolve(fn({ message }, { signal: ac.signal })).catch(() => null); } catch { call = Promise.resolve(null); }
  const promise = Promise.race([call, timeout, aborted]).then((v) => {
    clearTimeout(timer);
    const m = validateIntent(v);
    return m ? fromModel(m) : null;
  });
  return { promise, abort: () => { clearTimeout(timer); ac.abort(); } };
}

/* ---------- restatements ---------- */
const label = (c: string | null) => (!c || c === "Other" ? "your current carrier" : c);
export function buildRestatement(goal: "cancel" | "switch", from: string | null, to: string | null, keep: boolean | null): string {
  if (goal === "cancel") return from && from !== "Other" ? `Canceling your ${from} plan.` : "Canceling your current plan.";
  return `Switching from ${label(from)}${to ? ` to ${to}` : ""}${keep === true ? ", keeping your number" : ""}.`;
}
/** Model restatement is used only if it names the facts we hold and isn't hedged. */
export function safeModelRestatement(p: ParsedIntent): string | null {
  const r = p.restatement;
  if (!r || p.confidence !== "high" || p.goal === "unclear" || !p.fromCarrier) return null;
  const low = r.toLowerCase();
  const names = (c: string) => [c, ...(c === "T-Mobile" ? ["t mobile", "tmobile"] : c === "Mint Mobile" ? ["mint"] : [])].some((n) => low.includes(n.toLowerCase()));
  if (p.fromCarrier !== "Other" && !names(p.fromCarrier)) return null;
  if (p.toCarrier && !names(p.toCarrier)) return null;
  // Mentioned carriers in the restatement must all be ones we hold.
  for (const h of findCarriers(r)) if (h.name !== p.fromCarrier && h.name !== p.toCarrier) return null;
  // No extra questions, no number claims unless the structured field says so.
  const body = r.replace(/\s*(right\?|correct\?)\s*$/i, "");
  if (body.includes("?")) return null;
  if (p.keepNumber !== true && /number/i.test(body)) return null;
  if (p.goal === "cancel" && /switch|port|transfer/i.test(body)) return null;
  if (p.goal === "switch" && /cancel/i.test(body)) return null;
  const direction = parseIntent(body);
  if (direction.fromCarrier !== p.fromCarrier || direction.toCarrier !== p.toCarrier) return null;
  return r.replace(/\s*(right\?|correct\?)\s*$/i, "").trim();
}
