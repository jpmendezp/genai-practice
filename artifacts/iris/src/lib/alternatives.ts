import type { Facts } from "./iris-data";
import { num, totals, usd } from "./iris-logic";

export interface Alternatives {
  horizon: number | null;      // months to wait, 1..6, or null if waiting isn't meaningful
  until: Date | null;
  monthLabel: string | null;   // "March" or "March 2027"
  creditsRunOut: number;       // credits that finish by the horizon (only applicable credits)
  deviceAvoided: number;       // device balance paid down by the horizon
  exitNow: number;
  reasons: string[];           // one short reason per bubble
}

const money = (n: number) => usd(n).replace(".00", "");
export function monthLabel(now: Date, months: number): { date: Date; label: string } {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const m = d.toLocaleString("en-US", { month: "long" });
  return { date: d, label: d.getFullYear() === now.getFullYear() ? m : `${m} ${d.getFullYear()}` };
}

/** Pure: should the user leave now, negotiate, or wait? `ignoreCredits` when credit placement is unconfirmed. */
export function buildAlternatives(f: Facts, now: Date, opts: { ignoreCredits?: boolean } = {}): Alternatives {
  const t = totals(f);
  const ends: number[] = [];
  for (const l of f.perLine) {
    const d = num(l.deviceCount);
    if (d >= 1 && d <= 6 && num(l.deviceAmount) > 0) ends.push(d);
    const p = num(l.promoMonths);
    if (!opts.ignoreCredits && l.promoApplies && num(l.promoAmount) > 0 && p >= 1 && p <= 6) ends.push(p);
  }
  const reasons = [`Leave now: costs ${usd(t.exit)} today.`];
  if (!ends.length) {
    reasons.push("Ask for a better deal first.", "I'll ask for a lower price. You decide.");
    return { horizon: null, until: null, monthLabel: null, creditsRunOut: 0, deviceAvoided: 0, exitNow: t.exit, reasons };
  }
  const h = Math.max(...ends);
  const { date, label } = monthLabel(now, h);
  const deviceAvoided = f.perLine.reduce((a, l) => a + Math.min(h, num(l.deviceCount)) * num(l.deviceAmount), 0);
  const creditsRunOut = opts.ignoreCredits ? 0 : f.perLine.reduce((a, l) =>
    a + (l.promoApplies && num(l.promoMonths) <= h ? num(l.promoAmount) * num(l.promoMonths) : 0), 0);
  if (deviceAvoided > 0) reasons.push(`Wait until ${label}: leaving would cost about ${usd(deviceAvoided)} less.`);
  else reasons.push(`Waiting until ${label} won't lower your phone balance.`);
  if (creditsRunOut > 0) reasons.push(`${money(creditsRunOut)} in credits end by then. Other credits may still remain.`);
  reasons.push("Ask for a better deal first.", "I'll ask for a lower price. You decide.");
  return { horizon: h, until: date, monthLabel: label, creditsRunOut, deviceAvoided, exitNow: t.exit, reasons };
}
