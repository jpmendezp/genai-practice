export type Profile = "A" | "B" | "C";

export const CARRIERS = ["T-Mobile", "Verizon", "AT&T", "Cricket", "Mint Mobile", "Other"] as const;
export const SUPPORTED = ["T-Mobile", "Verizon", "AT&T"];

export const SAMPLES: { id: Profile; label: string; detail: string; carrier: string; text: string }[] = [
  {
    id: "A",
    label: "T-Mobile single line",
    detail: "One line with a financed phone and a promo credit",
    carrier: "T-Mobile",
    text: `T-Mobile monthly statement - Dana Whitfield
Plan: Go5G, 1 line .................. $75.00
Device: Pixel 8 installment 10 of 24 ... $27.08
  Remaining installments: 14
Promo credit: Go5G device promo ........ -$10.00
  Credits remaining: 14 months
Taxes & fees .......................... $6.42
Total due this month .................. $98.50`,
  },
  {
    id: "B",
    label: "Verizon family plan, 2 lines",
    detail: "One phone paid off, one still financed",
    carrier: "Verizon",
    text: `Verizon bill summary - The Okafor household
Unlimited Plus, 2 lines ............... $160.00
Line 1 (Marcus): iPhone 13 - paid in full
Line 2 (Ada): Galaxy S24 device payment
  Payment 16 of 36 ..................... $34.99
  Payments remaining: 20
Promo credit (trade-in) ............... -$15.00
  20 months remaining
Surcharges & taxes .................... $11.86
Total amount due ...................... $191.85`,
  },
  {
    id: "C",
    label: "AT&T single line, phone paid off",
    detail: "No device payments, no promo",
    carrier: "AT&T",
    text: `AT&T wireless statement - Rosa Lindqvist
Unlimited Starter, 1 line ............. $65.00
Device: iPhone 12 - installment plan complete
No active promotions on this account
Government fees & taxes ............... $5.17
Total due ............................. $70.17`,
  },
];

export interface LineFacts {
  deviceCount: string;
  deviceAmount: string;
  promoApplies: boolean;
  promoAmount: string;
  promoMonths: string;
}

export interface Facts {
  carrier: string;
  plan: string;
  monthly: string;
  lines: string;
  perLine: LineFacts[];
  etf: string;
}

export const emptyLine = (): LineFacts => ({
  deviceCount: "0",
  deviceAmount: "0",
  promoApplies: false,
  promoAmount: "0",
  promoMonths: "0",
});

export function factsFor(profile: Profile): Facts {
  if (profile === "B")
    return {
      carrier: "Verizon",
      plan: "Unlimited Plus",
      monthly: "160.00",
      lines: "2",
      perLine: [
        emptyLine(),
        { deviceCount: "20", deviceAmount: "34.99", promoApplies: true, promoAmount: "15.00", promoMonths: "20" },
      ],
      etf: "0",
    };
  if (profile === "C")
    return { carrier: "AT&T", plan: "Unlimited Starter", monthly: "65.00", lines: "1", perLine: [emptyLine()], etf: "0" };
  return {
    carrier: "T-Mobile",
    plan: "Go5G",
    monthly: "75.00",
    lines: "1",
    perLine: [{ deviceCount: "14", deviceAmount: "27.08", promoApplies: true, promoAmount: "10.00", promoMonths: "14" }],
    etf: "0",
  };
}

export const CHECKLIST = [
  "Get your number transfer PIN",
  "Get your account number",
  "Write down the confirmation number",
  "Confirm your final bill date",
  "Keep your phone on until your number transfers",
];

export const OFFERS = [
  {
    offer: "A monthly bill credit if you stay another 12 to 24 months.",
    decline: "Thank you, but I've decided to move my service. I'd like to finish the steps to leave today.",
  },
  {
    offer: "A free or discounted upgrade to a newer phone.",
    decline: "I appreciate it, but a new phone would mean a new payment plan, and I'm not looking for that.",
  },
  {
    offer: "A move to a cheaper plan with the same carrier.",
    decline: "That's kind of you, but I've already compared options and I'm ready to switch.",
  },
];
