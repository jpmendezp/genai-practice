import { SAMPLES, factsFor, type Facts, type LineFacts, type Profile } from "./iris-data";
import { MAX_LINES, isInt, isMoney, num, resizeLines, totals, usd } from "./iris-logic";
import { HOLDER, SAMPLE_PIN } from "./call-machine";

export type Stage =
  | "intent" | "carrier" | "bill" | "reading" | "confirm" | "edit" | "promo" | "rule" | "consent" | "notyet"
  | "call" | "offer" | "ring" | "incall" | "hold" | "expired" | "callback" | "done";
export type Speaker = "Carrier bot" | "Carrier agent" | "Iris" | "note";
export interface Line { id: number; speaker: Speaker; text: string }
export interface Chip { id: string; label: string }
export type Outcome = "cancelled" | "pin" | "kept";
export interface Result {
  outcome: Outcome; carrier: string; plan: string; conf: string; target: string; exit: number; giveUp: number;
  declined: number; offer: { monthly: number; months: number } | null; newPrice: number | null; pin: string | null;
  finalBill: string | null;
}
export type Msg = { id: string; at: number } & (
  | { from: "user"; kind: "text"; text: string }
  | { from: "user"; kind: "image"; profile: Profile }
  | { from: "iris"; kind: "text"; text: string }
  | { from: "iris"; kind: "bill"; facts: Facts; guess: boolean }
  | { from: "iris"; kind: "result"; result: Result }
  | { from: "iris"; kind: "copy"; text: string }
);
export interface IrisState {
  messages: Msg[]; chips: Chip[]; typing: boolean; stage: Stage; facts: Facts; draft: Facts | null;
  editingId: string | null; errors: string[]; sheet: "samples" | "transcript" | null; transcript: Line[];
  call: { startedAt: number } | null; holdUntil: number | null; caption: string; carrierName: string;
}

export const FINAL_BILL = "November 12, 2026";
const C = {
  cancel: { id: "cancel", label: "Cancel my phone plan" },
  switch: { id: "switch", label: "Switch carriers and keep my number" },
  tmo: { id: "c-tmo", label: "T-Mobile" }, vz: { id: "c-vz", label: "Verizon" }, att: { id: "c-att", label: "AT&T" }, other: { id: "c-other", label: "Other" },
  attach: { id: "attach", label: "📎 Attach bill" }, nobill: { id: "nobill", label: "I don't have it" },
  yes: { id: "yes", label: "Yes" }, off: { id: "off", label: "Something's off" },
  save: { id: "save", label: "Save changes" }, keep: { id: "keep", label: "Keep original" },
  l2: { id: "l2", label: "Just line 2" }, both: { id: "both", label: "Both lines" }, unsure: { id: "unsure", label: "Not sure" },
  decline: { id: "r-decline", label: "Decline everything" }, ask: { id: "r-ask", label: "Ask me if it's over $20/mo off" },
  go: { id: "go", label: "Yes, call them" }, notyet: { id: "notyet", label: "Not yet" }, ready: { id: "ready", label: "Ready now" },
  transcript: { id: "transcript", label: "See live transcript" }, skip: { id: "skip", label: "Skip ahead" },
  take: { id: "take", label: "Take the deal" }, declineOffer: { id: "decline-offer", label: "Decline" },
  callme: { id: "callme", label: "Call me now" }, callback: { id: "callback", label: "Call them back" },
  copy: { id: "copy", label: "Copy details" }, over: { id: "over", label: "Start over" },
} satisfies Record<string, Chip>;
const INTENT = [C.cancel, C.switch];
const CONFIRM = [C.yes, C.off];
const CALL = [C.transcript, C.skip];

/* ---------- text parsing ---------- */
export function carrierOf(t: string): string | null {
  const s = t.toLowerCase();
  if (/t[\s-]?mobile|\btmo\b|magenta/.test(s)) return "T-Mobile";
  if (/verizon|\bvzw?\b/.test(s)) return "Verizon";
  if (/at\s?&\s?t|\batt\b|at and t/.test(s)) return "AT&T";
  return null;
}
const OTHERS: [RegExp, string][] = [
  [/cricket/, "Cricket"], [/mint/, "Mint Mobile"], [/visible/, "Visible"], [/metro/, "Metro"], [/boost/, "Boost Mobile"],
  [/google fi|\bfi\b/, "Google Fi"], [/us cellular|uscellular/, "US Cellular"], [/xfinity/, "Xfinity Mobile"],
  [/spectrum/, "Spectrum Mobile"], [/straight talk/, "Straight Talk"], [/\bother\b|someone else|different one/, "Other"],
];
export function otherOf(t: string): string | null {
  const s = t.toLowerCase();
  for (const [r, l] of OTHERS) if (r.test(s)) return l;
  return null;
}
export function goalOf(t: string): "pin" | "cancel" | null {
  const s = t.toLowerCase();
  if (/switch|\bport|keep (my |the )?(phone )?number|transfer|move (my )?number|new carrier/.test(s)) return "pin";
  if (/cancel|\bquit|\bleave|\bleaving|close (my )?(account|line|plan)|end (my )?(plan|service)|get out/.test(s)) return "cancel";
  return null;
}
const isYes = (s: string) => /\b(y|yes|yeah|yep|yup|ya|sure|ok|okay|correct|right|perfect|confirm|looks good|go|do it|sounds good)\b/.test(s);
const RE = {
  restart: /\b(start over|restart|reset|start again)\b/,
  transcript: /transcript/,
  attach: /attach|screenshot|photo|upload|picture|send (it|the bill)|\bpic\b|📎/,
  nobill: /don'?t have|do not have|no bill|haven'?t|can'?t find|skip|\bnope?\b|lost it/,
  off: /off\b|wrong|not right|incorrect|\bno\b|edit|fix|change|mistake/,
  save: /\bsave|\bdone\b|looks good|\byes\b|update/,
  keep: /keep|original|undo|never ?mind|revert|discard/,
  unsure: /not sure|unsure|don'?t know|\bidk\b|no idea|no clue/,
  both: /both|all|each|every/,
  l2: /just|only|line ?2|second|ada/,
  ask: /\bask\b|check with|over|more than|above|ping|text me|\d/,
  decline: /decline|no deals?|none|nothing|refuse|reject|turn (it|them|everything) down|say no|all of them/,
  notyet: /not yet|later|wait|hold on|not now|\bno\b|nope|nah/,
  ready: /ready|\bnow\b|\bcall\b|go ahead|let'?s go/,
  skip: /skip|hurry|faster|speed|fast forward/,
  take: /take|accept|i'?ll take|want it|deal\b(?! no)/,
  declineOffer: /decline|\bno\b|pass|nah|nope|refuse/,
  callme: /call me|ready|\bnow\b|pick up|approve|\bcall\b|go ahead/,
  copy: /copy|clipboard/,
};

/* ---------- helpers ---------- */
const clone = (f: Facts): Facts => ({ ...f, perLine: f.perLine.map((l) => ({ ...l })) });
const money0 = (n: number) => usd(n).replace(".00", "");
const profileFor = (carrier: string): Profile => (carrier === "Verizon" ? "B" : carrier === "AT&T" ? "C" : "A");
const isBig3 = (c: string) => c === "T-Mobile" || c === "Verizon" || c === "AT&T";

/** Split prewritten Iris copy into short bubbles (two lines max on a narrow phone). */
export function chunk(text: string, max = 52): string[] {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const out: string[] = [];
  let cur = "";
  const pushWords = (s: string) => {
    let line = "";
    for (const w of s.split(/\s+/)) {
      if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim();
    }
    return line;
  };
  for (const s of sentences) {
    if ((cur + " " + s).trim().length <= max) { cur = (cur + " " + s).trim(); continue; }
    if (cur) out.push(cur);
    cur = s.length <= max ? s : pushWords(s);
  }
  if (cur) out.push(cur);
  return out;
}

export function validate(f: Facts): string[] {
  const e: string[] = [];
  if (!f.carrier.trim()) e.push("Carrier can't be blank.");
  if (!f.plan.trim()) e.push("Plan name can't be blank.");
  if (!isMoney(f.monthly)) e.push("Monthly price needs a dollar amount.");
  if (!isInt(f.lines, 1, MAX_LINES)) e.push(`Lines must be a whole number, 1 to ${MAX_LINES}.`);
  f.perLine.forEach((l, i) => {
    const n = f.perLine.length > 1 ? `Line ${i + 1}` : "Your line";
    if (!isInt(l.deviceCount) || !isMoney(l.deviceAmount)) e.push(`${n}: payments left and amount look off.`);
    if (!isMoney(l.promoAmount) || !isInt(l.promoMonths)) e.push(`${n}: credit amount and months look off.`);
  });
  if (!isMoney(f.etf)) e.push("Early termination fee needs a dollar amount.");
  return e;
}
const normalize = (f: Facts): Facts => ({
  ...f, carrier: f.carrier.trim(), plan: f.plan.trim(),
  perLine: f.perLine.map((l) => ({ ...l, promoApplies: num(l.promoAmount) > 0 && num(l.promoMonths) > 0 })),
});

export function resultText(r: Result): string {
  const L = ["IRIS CALL SUMMARY (simulated, fictional details)", `${r.carrier} - ${r.plan}`];
  if (r.outcome === "kept") {
    L.push("Outcome: You're staying. Nothing was cancelled and no PIN was issued.",
      `Deal: ${money0(r.offer!.monthly)}/mo off for ${r.offer!.months} months`, `New monthly price: ${usd(r.newPrice!)}`,
      `Reference: ${r.conf}`, "Service stays active. No final bill.");
  } else {
    L.push(`Outcome: ${r.target}`, `Confirmation: ${r.conf}`);
    if (r.pin) L.push(`Transfer PIN: ${r.pin}`);
    L.push(`Final bill: ${r.finalBill} (fictional)`, `Cost to leave: ${usd(r.exit)}`, `Credits you give up: ${usd(r.giveUp)}`);
  }
  L.push(`Retention offers declined: ${r.declined}`, "You skipped about 47 min on hold.");
  return L.join("\n");
}

type Item = { t: "msg"; msg: Msg } | { t: "do"; fn: () => void };

export class IrisController {
  private state: IrisState = IrisController.initial();
  private listeners = new Set<() => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private gen = 0;
  private q: Item[] = [];
  private running = false;
  private seq = 0;
  private lineSeq = 0;
  // conversation context
  private goal: "pin" | "cancel" | null = null;
  private carrier: string | null = null;
  private profile: Profile = "A";
  private promoUnsure = false;
  private rule: { kind: "decline" | "ask"; threshold: number } = { kind: "decline", threshold: 20 };
  private declined = 0;
  private offer: { monthly: number; months: number; next: number } | null = null;
  private awaiting: number | null = null;
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private skipNext = false;
  private result: Result | null = null;
  timing = { min: 600, max: 1200, phase: [0, 6000, 5000, 7000, 5000, 4500, 3500, 3000], scale: 1 };

  static initial(): IrisState {
    return {
      messages: [], chips: [], typing: false, stage: "intent", facts: factsFor("A"), draft: null, editingId: null, errors: [],
      sheet: null, transcript: [], call: null, holdUntil: null, caption: "", carrierName: "your carrier",
    };
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  get = () => this.state;
  private set(p: Partial<IrisState>) { this.state = { ...this.state, ...p }; this.listeners.forEach((l) => l()); }

  private after(ms: number, fn: () => void) {
    const g = this.gen;
    const id = setTimeout(() => { this.timers.delete(id); if (g === this.gen) fn(); }, ms * this.timing.scale);
    this.timers.add(id);
    return id;
  }
  private clear(id: ReturnType<typeof setTimeout> | null) { if (id) { clearTimeout(id); this.timers.delete(id); } }

  dispose() {
    this.gen++;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.q = []; this.running = false;
  }
  start() {
    this.dispose();
    this.goal = null; this.carrier = null; this.profile = "A"; this.promoUnsure = false;
    this.rule = { kind: "decline", threshold: 20 }; this.declined = 0; this.offer = null; this.awaiting = null;
    this.phaseTimer = null; this.holdTimer = null; this.skipNext = false; this.result = null;
    this.state = IrisController.initial();
    this.listeners.forEach((l) => l());
    this.say("Hey! I'm Iris 👋", "I call companies for you,", "so you don't have to deal with bots and hold music.", "What do you need?");
    this.chips(INTENT);
  }

  /* ---------- queue ---------- */
  private id() { return `m${++this.seq}`; }
  private enqueue(items: Item[]) { this.q.push(...items); if (!this.running) this.pump(); }
  private pump() {
    for (;;) {
      const it = this.q.shift();
      if (!it) { this.running = false; if (this.state.typing) this.set({ typing: false }); return; }
      this.running = true;
      if (it.t === "do") { it.fn(); continue; }
      this.set({ typing: true });
      const ms = this.timing.min + Math.random() * (this.timing.max - this.timing.min);
      this.after(ms, () => {
        this.set({ typing: false, messages: [...this.state.messages, { ...it.msg, at: Date.now() }] });
        this.after(140, () => this.pump());
      });
      return;
    }
  }
  private say(...texts: string[]) {
    this.enqueue(texts.flatMap((t) => chunk(t)).map((text) => ({ t: "msg" as const, msg: { id: this.id(), at: 0, from: "iris" as const, kind: "text" as const, text } })));
  }
  private card(msg: Msg) { this.enqueue([{ t: "msg", msg }]); }
  private then(fn: () => void) { this.enqueue([{ t: "do", fn }]); }
  private chips(c: Chip[]) { this.then(() => this.set({ chips: c })); }
  private user(m: Msg) { this.set({ messages: [...this.state.messages, m] }); }
  private lines(...ls: [Speaker, string][]) {
    this.set({ transcript: [...this.state.transcript, ...ls.map(([speaker, text]) => ({ id: ++this.lineSeq, speaker, text }))] });
  }
  private get cname() { return !this.carrier || this.carrier === "Other" ? "your carrier" : this.carrier; }
  private get Cname() { const c = this.cname; return c[0].toUpperCase() + c.slice(1); }

  /* ---------- public input ---------- */
  chip(c: Chip) {
    if (c.id === "attach") return this.openSamples();
    if (c.id === "transcript") return this.set({ sheet: "transcript" });
    if (c.id === "skip") return this.skip();
    if (c.id === "copy") return void this.copy();
    this.send(c.label);
  }
  openSamples() { if (this.state.stage === "bill") this.set({ sheet: "samples" }); }
  closeSheet() { this.set({ sheet: null }); }
  openTranscript() { this.set({ sheet: "transcript" }); }

  send(raw: string) {
    const text = raw.trim();
    if (!text) return;
    this.user({ id: this.id(), at: Date.now(), from: "user", kind: "text", text });
    const s = text.toLowerCase();
    if (RE.restart.test(s)) return this.start();
    if (RE.transcript.test(s) && this.state.transcript.length) return this.set({ sheet: "transcript" });
    const st = this.state.stage;
    switch (st) {
      case "intent": return this.onIntent(s);
      case "carrier": return this.onCarrier(s);
      case "bill":
        if (RE.nobill.test(s)) return this.noBill();
        if (RE.attach.test(s) || /\bbill\b/.test(s)) { this.set({ sheet: "samples" }); return; }
        return this.say("Tap 📎 Attach bill to send it, or tell me you don't have it.");
      case "reading": return this.say("One sec, still reading your bill.");
      case "confirm":
        if (RE.off.test(s)) return this.startEdit();
        if (isYes(s)) return this.afterConfirm();
        return this.say("Does the summary look right?", "Say yes, or tell me something's off.");
      case "edit":
        if (RE.keep.test(s)) return this.keepOriginal();
        if (RE.save.test(s)) return this.save();
        return this.say("Fix anything on the card above, then save.", "Or keep the original numbers.");
      case "promo":
        if (RE.unsure.test(s)) return this.onPromo("unsure");
        if (RE.both.test(s)) return this.onPromo("both");
        if (RE.l2.test(s)) return this.onPromo("l2");
        return this.say("Just need to know where that credit sits.", "Line 2, both lines, or not sure?");
      case "rule": {
        if (RE.ask.test(s)) { const m = s.match(/\$?\s*(\d+(?:\.\d+)?)/); return this.onRule("ask", m ? Number(m[1]) : 20); }
        if (RE.decline.test(s)) return this.onRule("decline", 20);
        return this.say("Should I turn down every deal,", "or check with you on the big ones?");
      }
      case "consent":
        if (RE.notyet.test(s)) return this.notYet();
        if (isYes(s) || RE.ready.test(s)) return this.startCall();
        return this.say("Want me to call now?", "Just say yes when you're ready.");
      case "notyet":
        if (isYes(s) || RE.ready.test(s)) return this.startCall();
        return this.say("Whenever you're ready, just say the word.");
      case "call":
        if (RE.skip.test(s)) return this.skip();
        return this.say(`I'm still on the line with ${this.cname}.`, "I'll text you the moment there's news.");
      case "callback": case "ring": case "incall":
        return this.say("Calling you now so you can approve.");
      case "offer":
        if (RE.declineOffer.test(s)) return this.declineOffer();
        if (RE.take.test(s) || isYes(s)) return this.takeDeal();
        return this.say("She's waiting on you.", "Take the deal, or decline?");
      case "hold":
        if (RE.callme.test(s) || isYes(s)) return this.callMe();
        return this.say("They're still holding for you.", "Say call me now when you want to approve.");
      case "expired":
        if (/back|again|retry|call|yes|ready/.test(s) || isYes(s)) return this.callBack();
        return this.say("Nothing was approved.", "Want me to call them back?");
      case "done":
        if (RE.copy.test(s)) return void this.copy();
        return this.say("All wrapped up.", "Want a copy of the details, or start over?");
    }
  }

  /* ---------- flow ---------- */
  private onIntent(s: string) {
    const g = goalOf(s);
    const c = carrierOf(s) ?? (g ? otherOf(s) : null);
    if (c) this.carrier = c;
    this.set({ carrierName: this.cname });
    if (g) {
      this.goal = g;
      this.set({ chips: [] });
      if (this.carrier) return this.askBill(`Got it, ${this.cname}.`);
      return this.askCarrier();
    }
    if (c) return this.say(`${c}, got it.`, "Do you want to cancel,", "or switch and keep your number?");
    this.say("I can only help with phone plans for now.", "Want to cancel or switch?");
  }
  private askCarrier() {
    this.set({ stage: "carrier", chips: [] });
    this.say("Got it. Who's your carrier?");
    this.chips([C.tmo, C.vz, C.att, C.other]);
  }
  private onCarrier(s: string) {
    const c = carrierOf(s) ?? otherOf(s);
    if (!c) {
      const g = goalOf(s);
      if (g) this.goal = g;
      return this.say("Just need your carrier.", "T-Mobile, Verizon, AT&T, or another one?");
    }
    this.carrier = c;
    this.set({ carrierName: this.cname, chips: [] });
    this.askBill(c === "Other" ? "No problem." : undefined);
  }
  private askBill(prefix?: string) {
    this.set({ stage: "bill", chips: [] });
    if (prefix) this.say(prefix);
    this.say("Send me a screenshot of your latest bill", "so I can see what leaving really costs.");
    this.chips([C.attach, C.nobill]);
  }
  pickSample(id: Profile) {
    if (this.state.stage !== "bill") return;
    const sample = SAMPLES.find((x) => x.id === id)!;
    this.set({ sheet: null, chips: [], stage: "reading" });
    this.user({ id: this.id(), at: Date.now(), from: "user", kind: "image", profile: id });
    this.profile = id;
    const f = factsFor(id);
    if (this.carrier && !isBig3(this.carrier)) f.carrier = this.carrier;
    else this.carrier = sample.carrier;
    this.set({ facts: f, carrierName: this.cname });
    this.say("Reading your bill...");
    this.then(() => {}); // keeps ordering explicit
    this.card({ id: this.id(), at: 0, from: "iris", kind: "bill", facts: clone(f), guess: false });
    this.say("Does this look right?");
    this.then(() => this.set({ stage: "confirm", chips: CONFIRM }));
  }
  private noBill() {
    this.profile = profileFor(this.carrier ?? "");
    const f = factsFor(this.profile);
    if (this.carrier && !isBig3(this.carrier)) f.carrier = this.carrier;
    this.set({ facts: f, chips: [], stage: "reading" });
    this.say("No problem. I'll confirm the numbers on the call.", `Here's a typical ${this.cname} plan like yours:`);
    this.card({ id: this.id(), at: 0, from: "iris", kind: "bill", facts: clone(f), guess: true });
    this.say("Does this look right?");
    this.then(() => this.set({ stage: "confirm", chips: CONFIRM }));
  }
  private lastBillId() { return [...this.state.messages].reverse().find((m) => m.kind === "bill")?.id ?? null; }
  private startEdit() {
    const id = this.lastBillId();
    if (!id) return;
    this.set({ stage: "edit", editingId: id, draft: clone(this.state.facts), errors: [], chips: [] });
    this.say("No problem. Fix anything on the card,", "then save.");
    this.chips([C.save, C.keep]);
  }
  editDraft(p: Partial<Facts>) {
    const d = this.state.draft;
    if (!d) return;
    const next = { ...d, ...p };
    if (p.lines !== undefined && isInt(p.lines, 1, MAX_LINES)) next.perLine = resizeLines(d.perLine, Number(p.lines));
    this.set({ draft: next, errors: [] });
  }
  editLine(i: number, p: Partial<LineFacts>) {
    const d = this.state.draft;
    if (!d) return;
    this.set({ draft: { ...d, perLine: d.perLine.map((l, j) => (j === i ? { ...l, ...p } : l)) }, errors: [] });
  }
  save() {
    const d = this.state.draft;
    if (!d || this.state.stage !== "edit") return;
    const errs = validate(d);
    if (errs.length) { this.set({ errors: errs }); return this.say("I can't save that yet.", ...errs); }
    const f = normalize(d);
    if (!isBig3(f.carrier)) this.carrier = f.carrier; else this.carrier = f.carrier;
    const id = this.state.editingId;
    this.set({
      facts: f, draft: null, editingId: null, errors: [], stage: "confirm", chips: [], carrierName: this.cname,
      messages: this.state.messages.map((m) => (m.id === id && m.kind === "bill" ? { ...m, facts: clone(f) } : m)),
    });
    this.say(`Saved. Cost to leave is now ${usd(totals(f).exit)}.`, "Does this look right?");
    this.chips(CONFIRM);
  }
  keepOriginal() {
    if (this.state.stage !== "edit") return;
    this.set({ draft: null, editingId: null, errors: [], stage: "confirm", chips: [] });
    this.say("Kept the original numbers.", "Does this look right?");
    this.chips(CONFIRM);
  }
  private afterConfirm() {
    const f = this.state.facts;
    this.set({ chips: [] });
    const l2 = f.perLine[1];
    if (this.profile === "B" && num(f.lines) >= 2 && l2?.promoApplies) {
      this.set({ stage: "promo" });
      this.say(`Quick one: does the ${money0(num(l2.promoAmount))} credit apply`, "to both lines or just line 2?");
      return this.chips([C.l2, C.both, C.unsure]);
    }
    this.askRule("Great.");
  }
  private onPromo(k: "l2" | "both" | "unsure") {
    this.set({ chips: [] });
    if (k === "both") {
      const f = this.state.facts, src = f.perLine[1];
      this.updateConfirmedFacts({ ...f, perLine: f.perLine.map((l) => ({ ...l, promoApplies: true, promoAmount: src.promoAmount, promoMonths: src.promoMonths })) });
      return this.askRule(`Got it, both lines. That's ${usd(totals(this.state.facts).giveUp)} in credits.`);
    }
    if (k === "unsure") { this.promoUnsure = true; return this.askRule("No worries. I'll ask them on the call."); }
    const f = this.state.facts;
    this.updateConfirmedFacts({ ...f, perLine: f.perLine.map((l, i) => i === 1 ? l : { ...l, promoApplies: false, promoAmount: "0", promoMonths: "0" }) });
    this.askRule("Got it, just line 2.");
  }
  private updateConfirmedFacts(f: Facts) {
    const id = this.lastBillId();
    this.set({ facts: f, messages: this.state.messages.map((m) => m.id === id && m.kind === "bill" ? { ...m, facts: clone(f) } : m) });
  }
  private askRule(prefix: string) {
    this.set({ stage: "rule" });
    this.say(prefix, "If they offer you a deal to stay, what should I do?");
    this.chips([C.decline, C.ask]);
  }
  private onRule(kind: "decline" | "ask", threshold: number) {
    this.rule = { kind, threshold: Number.isFinite(threshold) ? threshold : 20 };
    this.set({ chips: [], stage: "consent" });
    this.say(kind === "decline" ? "Got it. I'll turn down every offer." : `Got it. I'll check with you on anything over ${money0(this.rule.threshold)}/mo off.`);
    this.say(`Can I call ${this.cname} for you?`, "I won't approve anything final without you.");
    this.chips([C.go, C.notyet]);
  }
  private notYet() {
    this.set({ stage: "notyet", chips: [] });
    this.say("No problem, just text me when you're ready.");
    this.chips([C.ready]);
  }

  /* ---------- the call ---------- */
  private startCall() {
    this.declined = 0;
    this.set({ stage: "call", chips: [], transcript: [], call: { startedAt: Date.now() } });
    this.runPhase(1);
  }
  private schedule(n: number, ms = this.timing.phase[n] ?? 4000) {
    this.then(() => {
      if (this.state.stage !== "call") return;
      const wait = this.skipNext ? 0 : ms;
      this.skipNext = false;
      this.awaiting = n;
      this.phaseTimer = this.after(wait, () => { this.awaiting = null; this.phaseTimer = null; this.runPhase(n); });
    });
  }
  skip() {
    if (this.state.stage !== "call") return this.say("That part needs you, so I can't skip it.");
    if (this.awaiting !== null) {
      const n = this.awaiting;
      this.clear(this.phaseTimer);
      this.awaiting = null; this.phaseTimer = null;
      this.runPhase(n);
    } else this.skipNext = true;
  }
  private get action() {
    const f = this.state.facts, n = num(f.lines);
    if (this.goal === "pin") return "issue your transfer PIN, with your service staying active";
    if (this.profile === "B" && n >= 2) return "cancel line 2";
    return n > 1 ? `cancel all ${n} lines` : "cancel your line";
  }
  private runPhase(n: number) {
    const f = this.state.facts, t = totals(f), h = HOLDER[this.profile], c = this.cname;
    const pin = this.goal === "pin";
    switch (n) {
      case 1:
        this.lines(["note", `Dialing ${this.Cname}...`], ["Carrier bot", `Thanks for calling ${this.Cname}. In a few words, tell me why you're calling.`],
          ["Iris", pin ? "Transfer my number. Representative." : "Cancel service. Representative."]);
        this.say(`📞 Calling ${this.Cname}...`);
        this.then(() => this.set({ chips: CALL }));
        return this.schedule(2);
      case 2:
        this.lines(["Carrier bot", "It sounds like you're having trouble with your service. Let's try troubleshooting first."],
          ["Iris", "No thank you. There's no service problem. A person, please."],
          ["Carrier bot", "Good news, you may be eligible for an upgrade! Want to hear about new phones?"],
          ["Iris", "No thank you. I need a human representative."], ["Carrier bot", "One moment while I transfer you."]);
        this.say("Their bot wants me to try an upgrade 🙄", "Asking for a human.");
        return this.schedule(3);
      case 3:
        this.lines(["note", "On hold. Music playing."]);
        this.say("On hold. Don't worry, I'll wait.");
        return this.schedule(4);
      case 4: {
        const financed = f.perLine.filter((l) => num(l.deviceCount) > 0).length, lines = num(f.lines);
        this.lines(["Carrier agent", `Thanks for holding, this is Maria with ${this.Cname}. Who am I speaking with?`],
          ["Iris", `Hi Maria, I'm Iris, an assistant calling for the account holder, ${h.name}. Fictional account ending ${h.last4}. ${h.first} authorized me to speak for them.`],
          ["Carrier agent", "Thank you, that checks out. How can I help?"],
          ["Iris", `${h.first} has the ${f.plan} plan at ${usd(num(f.monthly))} a month with ${lines} line${lines === 1 ? "" : "s"}. ${financed ? `${usd(t.deviceSum)} is left on device payments` : "No phones are being financed"}, so leaving costs ${usd(t.exit)}. ${pin ? `${h.first} would like a number transfer PIN.` : `${h.first} would like to ${this.action}.`}`]);
        this.say("Got a real person, Maria.", "Verifying your account.");
        if (this.promoUnsure) {
          const l2 = f.perLine[1];
          this.lines(["Iris", `One question: is the ${money0(num(l2?.promoAmount ?? "15"))} credit on both lines or just line 2?`],
            ["Carrier agent", "Just line 2. Line 1 has no credits."]);
          this.promoUnsure = false;
          this.updateConfirmedFacts({ ...f, perLine: f.perLine.map((l, i) => (i === 1 ? l : { ...l, promoApplies: false, promoAmount: "0", promoMonths: "0" })) });
          this.say("She confirmed the credit is only on line 2.", `You'd give up ${usd(totals(this.state.facts).giveUp)} in credits.`);
        }
        return this.schedule(5);
      }
      case 5: return this.makeOffer(10, 12, 6, `Before you go, I can take $10 a month off for the next year if you stay with ${c}.`, "She offered $10/mo off for a year. Declined.");
      case 6: return this.makeOffer(25, 12, 7, "Okay, my best offer: $25 a month off for 12 months. That's $300 back.", "Then $25/mo off for 12 months. Declined that too.");
      case 7:
        this.lines(["Carrier agent", `Understood. To ${this.action} I need verbal approval from the account holder.`],
          ["Iris", `Of course. I'm calling ${h.first} now. One moment.`]);
        this.say("She needs your OK. Calling you now.");
        return this.then(() => this.ring());
    }
  }
  private makeOffer(monthly: number, months: number, next: number, pitch: string, declinedMsg: string) {
    this.lines(["Carrier agent", pitch]);
    const ask = (monthly === 25 && this.profile === "B") || (this.rule.kind === "ask" && monthly > this.rule.threshold);
    if (ask) {
      this.offer = { monthly, months, next };
      this.set({ stage: "offer", chips: [] });
      this.lines(["Iris", "Let me check with the account holder. One moment."]);
      this.say(`She's offering ${money0(monthly)}/mo off for ${months} months (${money0(monthly * months)})`, "if you stay. Want it?");
      return this.chips([C.take, C.declineOffer, C.transcript]);
    }
    this.declined++;
    this.lines(["Iris", "Thank you, but the account holder has decided. Please continue."]);
    this.say(declinedMsg);
    this.schedule(next);
  }
  takeDeal() {
    if (this.state.stage !== "offer" || !this.offer) return;
    const o = this.offer, f = this.state.facts;
    this.lines(["Iris", `${HOLDER[this.profile].first} would like to accept the ${money0(o.monthly)}/mo off for ${o.months} months and keep the service.`],
      ["Carrier agent", `Done. ${money0(o.monthly)} a month off for ${o.months} months starts next bill. Nothing is cancelled. Reference OFF-48213.`],
      ["Iris", "Thank you, Maria. That's everything."], ["note", "Call ended."]);
    this.result = {
      outcome: "kept", carrier: this.cname, plan: f.plan, conf: "OFF-48213", target: "Staying", exit: 0, giveUp: 0, declined: this.declined,
      offer: { monthly: o.monthly, months: o.months }, newPrice: Math.max(0, num(f.monthly) - o.monthly), pin: null, finalBill: null,
    };
    this.offer = null;
    this.finish();
  }
  declineOffer() {
    if (this.state.stage !== "offer" || !this.offer) return;
    const next = this.offer.next;
    this.offer = null;
    this.declined++;
    this.lines(["Iris", "Thank you, but the answer is no. Please continue."]);
    this.set({ stage: "call", chips: [] });
    this.say("Declined. Back to it.");
    this.then(() => this.set({ chips: CALL }));
    this.schedule(next, 3500);
  }
  private ring() {
    const t = totals(this.state.facts);
    this.set({
      stage: "ring", chips: [], holdUntil: null, sheet: null,
      caption: `${this.Cname} is ready to ${this.action}. Cost to leave is ${usd(t.exit)} and your last bill is Nov 12. Do you approve?`,
    });
  }
  accept() { if (this.state.stage === "ring") this.set({ stage: "incall" }); }
  hold() {
    const st = this.state.stage;
    if (st !== "ring" && st !== "incall") return;
    this.clear(this.holdTimer);
    this.set({ stage: "hold", chips: [], holdUntil: Date.now() + 120000 * this.timing.scale });
    this.lines(["Iris", "The account holder needs a moment. Could you hold for two minutes?"], ["Carrier agent", "Sure, I'll hold."]);
    this.say("No worries, I'll keep them on hold for 2 minutes.");
    this.chips([C.callme, C.transcript]);
    this.holdTimer = this.after(120000, () => this.expire());
  }
  private callMe() {
    this.clear(this.holdTimer); this.holdTimer = null;
    this.set({ chips: [], holdUntil: null, stage: "callback" });
    this.say("Calling you now.");
    this.then(() => this.ring());
  }
  private expire() {
    this.holdTimer = null;
    this.lines(["Carrier agent", "I'm sorry, I can't hold any longer. Please call back anytime."], ["note", "Call ended. Nothing was approved."]);
    this.set({ stage: "expired", chips: [], holdUntil: null, call: null });
    this.say("They couldn't hold any longer, so I hung up.", "Nothing was approved. Want me to call back?");
    this.chips([C.callback, C.transcript]);
  }
  private callBack() {
    this.set({ stage: "callback", chips: [], call: { startedAt: Date.now() } });
    this.lines(["note", `Calling ${this.Cname} back...`], ["Carrier agent", "Welcome back, I have your notes right here."], ["Iris", "Thank you. Connecting the account holder to approve."]);
    this.say(`📞 Calling ${this.Cname} back...`, "Got Maria again. Calling you to approve.");
    this.then(() => this.ring());
  }
  approve() {
    if (this.state.stage !== "incall") return;
    const f = this.state.facts, t = totals(f), pin = this.goal === "pin", h = HOLDER[this.profile];
    this.lines(["note", `${h.first} approved on the line.`],
      ["Carrier agent", pin ? `Thank you, ${h.first}. Your transfer PIN is ${SAMPLE_PIN} and your service stays active. Reference PIN-48213.` : `Thank you, ${h.first}. That's done. Your confirmation number is CXL-48213.`],
      ["Iris", "Thank you. Can you confirm the final bill date?"], ["Carrier agent", `Your final bill will be issued on ${FINAL_BILL}.`],
      ["Iris", "That's everything. Thanks, Maria."], ["note", "Call ended."]);
    const act = this.action;
    this.result = {
      outcome: pin ? "pin" : "cancelled", carrier: this.cname, plan: f.plan, conf: pin ? "PIN-48213" : "CXL-48213",
      target: pin ? "Transfer PIN issued, service active" : act.replace(/^cancel/, "Cancelled"),
      exit: t.exit, giveUp: t.giveUp, declined: this.declined, offer: null, newPrice: null, pin: pin ? SAMPLE_PIN : null, finalBill: FINAL_BILL,
    };
    this.finish();
  }
  private finish() {
    this.set({ stage: "done", chips: [], call: null, holdUntil: null, caption: "" });
    this.say("Done ✅");
    this.card({ id: this.id(), at: 0, from: "iris", kind: "result", result: this.result! });
    this.say("Anything else?");
    this.chips([C.copy, C.over]);
  }
  async copy() {
    if (!this.result) return;
    const text = resultText(this.result);
    const g = this.gen;
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      if (g !== this.gen) return;
      this.say("Copied. Paste it anywhere.");
    } catch {
      if (g !== this.gen) return;
      this.say("I couldn't reach your clipboard.", "Here it is, select and copy:");
      this.card({ id: this.id(), at: 0, from: "iris", kind: "copy", text });
    }
  }
}
