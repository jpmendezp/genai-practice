import { CHECKLIST, OFFERS, SUPPORTED, emptyLine, type Facts, type Profile } from "./iris-data";

export const MAX_LINES = 10;
export const MAX_MONTHS = 60;
export const MAX_MONEY = 10000;

export const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) <= MAX_MONEY;
export const isInt = (v: string, min = 0, max = MAX_MONTHS) =>
  /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;
export const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export type BillError = "empty" | "unreadable" | null;
export function checkBill(text: string): BillError {
  const t = text.trim();
  if (!t) return "empty";
  if (t.length < 40 || !/\$\s?\d/.test(t)) return "unreadable";
  return null;
}

export const isUnsupported = (carrier: string) => !!carrier && !SUPPORTED.includes(carrier);

export function matchProfile(text: string, carrier: string, sample: Profile | null): Profile {
  if (isUnsupported(carrier)) return "A";
  const t = text.toLowerCase();
  if (t.includes("verizon") || sample === "B") return "B";
  if (/at&t|at\s?and\s?t|\batt\b/.test(t) || sample === "C") return "C";
  return "A";
}

export function resizeLines(perLine: Facts["perLine"], n: number) {
  const next = perLine.slice(0, n);
  while (next.length < n) next.push(emptyLine());
  return next;
}

export type FactKey = "carrier" | "plan" | "monthly" | "lines" | "devices" | "promo" | "etf";
export const FACT_KEYS: FactKey[] = ["carrier", "plan", "monthly", "lines", "devices", "promo", "etf"];

export function factValid(f: Facts, k: FactKey): boolean {
  switch (k) {
    case "carrier":
      return f.carrier.trim().length > 0;
    case "plan":
      return f.plan.trim().length > 0;
    case "monthly":
      return isMoney(f.monthly);
    case "lines":
      return isInt(f.lines, 1, MAX_LINES);
    case "devices":
      return f.perLine.every((l) => isInt(l.deviceCount) && isMoney(l.deviceAmount));
    case "promo":
      return f.perLine.every((l) => !l.promoApplies || (isMoney(l.promoAmount) && isInt(l.promoMonths)));
    case "etf":
      return isMoney(f.etf);
  }
}

export function totals(f: Facts) {
  const devices = f.perLine.map((l) => num(l.deviceCount) * num(l.deviceAmount));
  const credits = f.perLine.map((l) => (l.promoApplies ? num(l.promoAmount) * num(l.promoMonths) : 0));
  const deviceSum = devices.reduce((a, b) => a + b, 0);
  const etf = num(f.etf);
  return { devices, credits, deviceSum, etf, exit: deviceSum + etf, giveUp: credits.reduce((a, b) => a + b, 0) };
}

export function breakdown(f: Facts) {
  const t = totals(f);
  const parts = f.perLine.map((l, i) => {
    const label = f.perLine.length > 1 ? `Line ${i + 1}: ` : "";
    return num(l.deviceCount) === 0
      ? `${label}phone paid off ($0.00)`
      : `${label}${num(l.deviceCount)} payments x ${usd(num(l.deviceAmount))} = ${usd(t.devices[i])}`;
  });
  return `${parts.join(" + ")} + early termination fee ${usd(t.etf)} = ${usd(t.exit)}`;
}

export function contactInfo(carrier: string) {
  const verified = SUPPORTED.includes(carrier);
  return {
    verified,
    label: verified ? "Verified for this carrier" : "Not verified for this carrier",
    text: `Call ${carrier || "your carrier"} customer care using the number on your bill and ask for the account or loyalty team. If you'd rather talk face to face, visit one of their stores in person and ask for help closing out your account.`,
  };
}

export function script(profile: Profile, f: Facts): string[] {
  const t = totals(f);
  const c = f.carrier || "your company";
  if (profile === "B") {
    const financed = f.perLine.filter((l) => num(l.deviceCount) > 0).length;
    return [
      `Hi, I'm calling about my ${c} ${f.plan} plan with ${num(f.lines)} lines. I'm planning to switch carriers.`,
      `I understand ${financed === 0 ? "none of our phones are" : financed === 1 ? "one of our phones is" : `${financed} of our phones are`} still on a device payment plan, and the rest are paid off.`,
      `By my count, the remaining device balance is ${usd(t.deviceSum)}, plus an early termination fee of ${usd(t.etf)}, for ${usd(t.exit)} total. Can you confirm that?`,
      `Can you also confirm exactly which line the promo credit is on? I believe I'd give up ${usd(t.giveUp)} in credits.`,
      `Please tell me the final amount I'd owe and when my last bill will arrive.`,
    ];
  }
  if (profile === "C") {
    return [
      `Hi, I'm calling about my ${c} ${f.plan} plan. I'm planning to switch carriers.`,
      `My phone is fully paid off and I don't have any active promotions.`,
      `Can you confirm I won't owe anything beyond my early termination fee of ${usd(t.etf)}, for ${usd(t.exit)} total?`,
      `I'd like my number transfer PIN and account number, please.`,
      `When will my final bill arrive, and will it be prorated?`,
    ];
  }
  const l = f.perLine[0] ?? emptyLine();
  return [
    `Hi, I'm calling about my ${c} ${f.plan} plan. I'm planning to switch carriers.`,
    `I have ${num(l.deviceCount)} payments of ${usd(num(l.deviceAmount))} left on my phone.`,
    `I understand leaving means paying ${usd(t.exit)}, including an early termination fee of ${usd(t.etf)}. Can you confirm that?`,
    `I also understand I'll give up ${usd(t.giveUp)} in remaining promo credits.`,
    `Please confirm the payoff amount and the date of my final bill.`,
  ];
}

export function briefText(profile: Profile, f: Facts, checked: boolean[]): string {
  const t = totals(f);
  const c = contactInfo(f.carrier);
  return [
    "IRIS SWITCH BRIEF",
    `${f.carrier} - ${f.plan} - ${usd(num(f.monthly))}/month - ${num(f.lines)} line${num(f.lines) === 1 ? "" : "s"}`,
    "",
    `Cost to leave today: ${usd(t.exit)}`,
    `Credits you give up: ${usd(t.giveUp)}`,
    `Breakdown: ${breakdown(f)}`,
    "",
    "HOW TO CONTACT THEM",
    `${c.label}`,
    c.text,
    "",
    "WHAT TO SAY",
    ...script(profile, f).map((s) => `- ${s}`),
    "",
    "OFFERS THEY'LL LIKELY MAKE, AND HOW TO DECLINE",
    ...OFFERS.flatMap((o, i) => [`${i + 1}. Offer: ${o.offer}`, `   Decline: "${o.decline}"`]),
    "",
    "CHECKLIST",
    ...CHECKLIST.map((item, i) => `[${checked[i] ? "x" : " "}] ${item}`),
    "",
    "Iris doesn't contact your carrier for you and isn't legal advice. It explains what your own bill says.",
  ].join("\n");
}
