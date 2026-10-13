import type { Facts, Profile } from "./iris-data";
import { num, totals, usd } from "./iris-logic";

export type Goal = "cancel" | "pin";
export type Rule = "decline" | "ask";
export interface Instructions { goal: Goal; rule: Rule; threshold: string; phone: string; consent: boolean }
export const defaultInstructions = (): Instructions => ({ goal: "cancel", rule: "decline", threshold: "15", phone: "(574) 555-0142", consent: false });

export type Speaker = "Carrier bot" | "Carrier agent" | "Iris";
export type Status = "Dialing" | "Talking to carrier bot" | "On hold" | "Talking to a human agent" | "Waiting for you" | "Call ended";
export type Outcome = "cancelled" | "pin" | "kept";
export interface Offer { id: number; monthly: number; months: number; text: string }

type Base = { phase: number; wait: number };
export type Ev = Base & (
  | { k: "line"; speaker: Speaker; text: string; declined?: boolean }
  | { k: "status"; status: Status }
  | { k: "gate"; offer: Offer; declineText: string; accept: Ev[] }
  | { k: "approval" }
  | { k: "finish"; outcome: Outcome }
);

export const HOLDER: Record<Profile, { name: string; first: string; last4: string }> = {
  A: { name: "Dana Whitfield", first: "Dana", last4: "4417" },
  B: { name: "Marcus Okafor", first: "Marcus", last4: "8032" },
  C: { name: "Rosa Lindqvist", first: "Rosa", last4: "2659" },
};
export const FINAL_BILL_DATE = "November 14, 2026";
export const SAMPLE_PIN = "731946";
export const confNumber = (o: Outcome) => (o === "cancelled" ? "CXL-48213" : o === "pin" ? "PIN-48213" : "OFF-48213");
export const offerText = (o: Offer) => `${usd(o.monthly).replace(".00", "")}/month off for ${o.months} months`;
export const gateCopy = (o: Offer) => `Iris needs your input: the agent offers ${offerText(o)} if you stay. Accept or decline?`;

export function shouldAsk(profile: Profile, ins: Instructions, o: Offer): boolean {
  if (o.monthly <= 0) return false;
  if (profile === "B" && o.id === 1) return true;
  return ins.rule === "ask" && o.monthly > num(ins.threshold);
}

export function buildScript(profile: Profile, f: Facts, ins: Instructions): Ev[] {
  const t = totals(f);
  const h = HOLDER[profile];
  const pin = ins.goal === "pin";
  const c = f.carrier || "your carrier";
  const lines = num(f.lines);
  const financed = f.perLine.filter((l) => num(l.deviceCount) > 0).length;
  const L = (phase: number, wait: number, speaker: Speaker, text: string, declined?: boolean): Ev => ({ phase, wait, k: "line", speaker, text, declined });
  const S = (phase: number, wait: number, status: Status): Ev => ({ phase, wait, k: "status", status });
  const why = pin ? "move the number to a new carrier" : "close the account";
  const offers: { offer: Offer; pitch: string; decline: string }[] = [
    {
      offer: { id: 1, monthly: 20, months: 12, text: "" },
      pitch: `Before we do that, I can take $20 a month off your bill for the next 12 months if you stay with ${c}.`,
      decline: `That's generous, thank you. ${h.first} has already decided. Leaving costs ${usd(t.exit)} today and ${h.first} is ready to ${why}.`,
    },
    {
      offer: { id: 2, monthly: 10, months: 6, text: "" },
      pitch: "I understand. I could also do $10 a month off for 6 months, no strings attached.",
      decline: `I appreciate it, but the answer is still no thank you. Please continue so ${h.first} can ${why}.`,
    },
    {
      offer: { id: 3, monthly: 0, months: 0, text: "" },
      pitch: "Last one. I can get you a free upgrade to a newer phone today if you stay on the line.",
      decline: `Thank you, but a new phone would mean a new payment plan. ${h.first} would like to finish today.`,
    },
  ];
  const ev: Ev[] = [
    S(1, 300, "Talking to carrier bot"),
    L(1, 1500, "Carrier bot", `Thanks for calling ${c}. In a few words, tell me what you're calling about.`),
    L(1, 3200, "Iris", pin ? "Number transfer PIN. Representative." : "Cancel service. Representative."),
    S(2, 2600, "Talking to carrier bot"),
    L(2, 400, "Carrier bot", pin ? "It sounds like you might be having trouble with your service. Let's run a quick troubleshooting check first." : "It sounds like you might be having trouble with your service. Let's try some troubleshooting first."),
    L(2, 3200, "Iris", "No thank you. There's no service problem. Please connect me with a person."),
    L(2, 3000, "Carrier bot", "Good news, you may be eligible for an upgrade. Would you like to hear about new phones?"),
    L(2, 3000, "Iris", `No thank you. I'm calling for the account holder and need a human representative, please.`),
    L(2, 2600, "Carrier bot", "One moment while I transfer you."),
    S(3, 1600, "On hold"),
    S(4, 5000, "Talking to a human agent"),
    L(4, 400, "Carrier agent", `Thanks for holding, this is Jordan with ${c}. Who am I speaking with?`),
    L(4, 3000, "Iris", `Hi Jordan, I'm Iris, an assistant calling on behalf of the account holder, ${h.name}. The last four digits of the fictional account number are ${h.last4}. ${h.first} has authorized me to speak for them.`),
    L(4, 3600, "Carrier agent", "Thank you, that checks out. What can I help with today?"),
    L(4, 2800, "Iris", `${h.first} has the ${c} ${f.plan} plan at ${usd(num(f.monthly))} a month with ${lines} line${lines === 1 ? "" : "s"}. ${financed === 0 ? "No phones are still being financed." : `${financed} phone${financed === 1 ? " is" : "s are"} still being financed, ${usd(t.deviceSum)} remaining.`} We understand leaving costs ${usd(t.exit)} today. ${pin ? `${h.first} would like a number transfer PIN, without cancelling the service.` : `${h.first} would like to cancel the service.`}`),
  ];
  const tail: Ev[] = [
    L(6, 2800, "Carrier agent", pin ? "Okay. To issue a transfer PIN I need verbal approval from the account holder." : "Okay. To process the cancellation I need verbal approval from the account holder."),
    L(6, 2800, "Iris", `Understood. I'm calling ${h.first} now to approve. One moment, please.`),
    { phase: 6, wait: 1500, k: "approval" },
    L(7, 1200, "Carrier agent", pin ? `Thank you, ${h.first}. Your number transfer PIN is ready and your service stays active. Your reference is PIN-48213.` : `Thank you, ${h.first}. Your cancellation is processed. Your confirmation number is CXL-48213.`),
    L(7, 3000, "Iris", "Thank you, Jordan. Could you confirm the final bill date?"),
    L(7, 2800, "Carrier agent", pin ? `Once the number moves, your final bill will be issued on ${FINAL_BILL_DATE}.` : `Your final bill will be issued on ${FINAL_BILL_DATE}.`),
    L(7, 2400, "Iris", "That's everything. Thank you for your help."),
    { phase: 7, wait: 2500, k: "finish", outcome: pin ? "pin" : "cancelled" },
  ];
  offers.forEach(({ offer, pitch, decline }, i) => {
    offer.text = offerText(offer);
    if (i === 0) ev.push(S(5, 3600, "Talking to a human agent"));
    ev.push(L(5, i === 0 ? 300 : 2800, "Carrier agent", pitch));
    if (shouldAsk(profile, ins, offer)) {
      ev.push({
        phase: 5, wait: 1600, k: "gate", offer, declineText: decline,
        accept: [
          L(5, 800, "Iris", `${h.first} would like to accept the ${offer.text}, and keep the service active.`),
          L(5, 2800, "Carrier agent", `Done. The ${offer.text} is on the account starting next bill. Nothing is cancelled. Your reference is OFF-48213.`),
          L(5, 2800, "Iris", "Thank you, Jordan. That's everything for today."),
          { phase: 5, wait: 2500, k: "finish", outcome: "kept" },
        ],
      });
    } else {
      ev.push(L(5, 3000, "Iris", decline, true));
    }
  });
  // Tune pacing: ~48 s of scripted time before the approval call.
  return [...ev, ...tail].map((e) => (e.phase < 7 ? { ...e, wait: Math.round(e.wait * 0.8) } : e));
}

export type Mode = "running" | "offer" | "ring" | "approve" | "paused" | "expired" | "done";
export interface CallState {
  events: Ev[]; idx: number; since: number; mode: Mode; status: Status; phase: number;
  lines: { id: number; speaker: Speaker; text: string }[];
  declined: number; holdLeft: number; callMs: number; gate: Extract<Ev, { k: "gate" }> | null;
  outcome: Outcome | null; accepted: Offer | null;
}
export type Action = { type: "tick"; dt: number } | { type: "skip" } | { type: "offer"; accept: boolean } | { type: "answer" } | { type: "hold" } | { type: "approve" };
export const HOLD_MS = 120000;

export const initCall = (events: Ev[]): CallState => ({
  events, idx: 0, since: 0, mode: "running", status: "Dialing", phase: 0, lines: [], declined: 0,
  holdLeft: HOLD_MS, callMs: 0, gate: null, outcome: null, accepted: null,
});

function apply(s: CallState): CallState {
  const e = s.events[s.idx];
  const n: CallState = { ...s, idx: s.idx + 1, since: 0, phase: e.phase };
  if (e.k === "line") { n.lines = [...s.lines, { id: s.lines.length, speaker: e.speaker, text: e.text }]; if (e.declined) n.declined++; }
  else if (e.k === "status") n.status = e.status;
  else if (e.k === "gate") { n.mode = "offer"; n.status = "Waiting for you"; n.gate = e; }
  else if (e.k === "approval") { n.mode = "ring"; n.status = "Waiting for you"; }
  else if (e.k === "finish") { n.mode = "done"; n.status = "Call ended"; n.outcome = e.outcome; }
  return n;
}

export const canSkip = (s: CallState) => s.mode === "running" && s.phase < 6 && s.events[s.idx]?.phase < 6 && s.idx < s.events.length;

export function callReducer(s: CallState, a: Action): CallState {
  switch (a.type) {
    case "tick": {
      if (s.mode === "done" || s.mode === "expired") return s;
      let n: CallState = { ...s, callMs: s.callMs + a.dt };
      if (n.mode === "paused") {
        n.holdLeft = Math.max(0, n.holdLeft - a.dt);
        if (n.holdLeft === 0) n = { ...n, mode: "expired", status: "Call ended" };
        return n;
      }
      if (n.mode !== "running") return n;
      n.since += a.dt;
      while (n.mode === "running" && n.idx < n.events.length && n.since >= n.events[n.idx].wait) {
        n = apply(n); // since resets to 0: one event per wait, no bursts
      }
      return n;
    }
    case "skip": {
      if (!canSkip(s)) return s;
      let n = s;
      const cur = Math.max(n.phase, n.events[n.idx].phase);
      while (n.mode === "running" && n.idx < n.events.length && n.events[n.idx].phase === cur) n = apply(n);
      if (n.mode === "running" && n.idx < n.events.length) n = { ...n, since: n.events[n.idx].wait };
      return n;
    }
    case "offer": {
      if (s.mode !== "offer" || !s.gate) return s;
      const g = s.gate;
      if (a.accept) return { ...s, mode: "running", status: "Talking to a human agent", gate: null, accepted: g.offer, since: 0, events: [...s.events.slice(0, s.idx), ...g.accept] };
      const decline: Ev = { phase: 5, wait: 600, k: "line", speaker: "Iris", text: g.declineText, declined: true };
      return { ...s, mode: "running", status: "Talking to a human agent", gate: null, since: 0, events: [...s.events.slice(0, s.idx), decline, ...s.events.slice(s.idx)] };
    }
    case "answer":
      return s.mode === "ring" || s.mode === "paused" ? { ...s, mode: "approve" } : s;
    case "hold":
      return s.mode === "ring" || s.mode === "approve" ? { ...s, mode: "paused", holdLeft: HOLD_MS } : s;
    case "approve":
      return s.mode === "approve" ? { ...s, mode: "running", status: "Talking to a human agent", since: 0 } : s;
  }
}

export const fmtClock = (ms: number) => {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

export interface CallResult { outcome: Outcome; declined: number; callMs: number; accepted: Offer | null }
