import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import type { Facts, LineFacts, Profile } from "@/lib/iris-data";
import { FACT_KEYS, MAX_LINES, factValid, isInt, isMoney, type FactKey } from "@/lib/iris-logic";
import { Btn, Card, LooksRight, inputCls } from "./ui";
import { cn } from "@/lib/utils";

interface Props {
  facts: Facts;
  profile: Profile;
  unsupported: boolean;
  checks: Record<FactKey, boolean>;
  onFact: (k: FactKey, patch: Partial<Facts>) => void;
  onLine: (k: FactKey, i: number, patch: Partial<LineFacts>) => void;
  onCheck: (k: FactKey, v: boolean) => void;
  onBack: () => void;
  onBuild: () => void;
}

function Fact({ k, title, children, p, error }: { k: FactKey; title: string; children: ReactNode; p: Props; error?: string }) {
  const valid = factValid(p.facts, k);
  return (
    <Card className={cn("space-y-3 transition-colors", p.checks[k] && "border-[hsl(168_30%_70%)]")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <LooksRight id={k} checked={p.checks[k]} onChange={(v) => p.onCheck(k, v)} disabled={!valid} />
      </div>
      {children}
      {!valid && <p role="alert" className="text-sm font-medium text-destructive">{error ?? "Please enter a valid value."}</p>}
    </Card>
  );
}

function Num({ id, label, value, onChange, money, invalid }: { id: string; label: string; value: string; onChange: (v: string) => void; money?: boolean; invalid: boolean }) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="relative">
        {money && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>}
        <input
          id={id}
          data-testid={`input-${id}`}
          inputMode={money ? "decimal" : "numeric"}
          value={value}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value.replace(money ? /[^\d.]/g : /\D/g, ""))}
          className={cn(inputCls, "tnum", money && "pl-7")}
        />
      </div>
    </div>
  );
}

export function StepFacts(p: Props) {
  const { facts: f } = p;
  const allChecked = FACT_KEYS.every((k) => p.checks[k]);
  const allValid = FACT_KEYS.every((k) => factValid(f, k));
  const remaining = FACT_KEYS.filter((k) => !p.checks[k]).length;
  const multi = f.perLine.length > 1;

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-[1.9rem] leading-tight sm:text-4xl">Here's what Iris found. Check each one.</h1>
      <p className="text-muted-foreground">Fix anything that doesn't match your bill, then tap Looks right.</p>

      <Fact k="carrier" title="Carrier" p={p} error="Enter your carrier's name.">
        <input aria-label="Carrier" data-testid="input-fact-carrier" className={inputCls} value={f.carrier} onChange={(e) => p.onFact("carrier", { carrier: e.target.value })} />
        {p.unsupported && <p className="text-sm text-muted-foreground">Iris used example numbers for this carrier. Please check every value carefully.</p>}
      </Fact>
      <Fact k="plan" title="Plan name" p={p} error="Enter your plan name.">
        <input aria-label="Plan name" data-testid="input-fact-plan" className={inputCls} value={f.plan} onChange={(e) => p.onFact("plan", { plan: e.target.value })} />
      </Fact>
      <Fact k="monthly" title="Monthly cost" p={p} error="Enter a dollar amount, like 75.00.">
        <Num id="monthly" label="Per month" money value={f.monthly} invalid={!isMoney(f.monthly)} onChange={(v) => p.onFact("monthly", { monthly: v })} />
      </Fact>
      <Fact k="lines" title="Number of lines" p={p} error={`Enter a whole number from 1 to ${MAX_LINES}.`}>
        <Num id="lines" label="Lines" value={f.lines} invalid={!isInt(f.lines, 1, MAX_LINES)} onChange={(v) => p.onFact("lines", { lines: v })} />
      </Fact>
      <Fact k="devices" title="Device payments" p={p} error="Use whole numbers for payments and dollar amounts for the monthly charge.">
        {f.perLine.map((l, i) => (
          <div key={i} className="space-y-1">
            {multi && <p className="text-sm font-semibold">Line {i + 1}</p>}
            <div className="flex gap-3">
              <Num id={`dev-count-${i}`} label="Payments left" value={l.deviceCount} invalid={!isInt(l.deviceCount)} onChange={(v) => p.onLine("devices", i, { deviceCount: v })} />
              <Num id={`dev-amt-${i}`} label="Per month" money value={l.deviceAmount} invalid={!isMoney(l.deviceAmount)} onChange={(v) => p.onLine("devices", i, { deviceAmount: v })} />
            </div>
          </div>
        ))}
      </Fact>
      <Fact k="promo" title="Promo credit" p={p} error="Use a dollar amount and whole months for each line with a credit.">
        {p.profile === "B" && (
          <div className="flex gap-3 rounded-xl border border-[hsl(42_70%_70%)] bg-accent p-3.5 text-accent-foreground" role="note">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Iris isn't sure whether the promo credit applies to both lines. Please check this one.</p>
          </div>
        )}
        {f.perLine.map((l, i) => (
          <div key={i} className="space-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
              <input type="checkbox" data-testid={`check-promo-applies-${i}`} className="h-5 w-5 accent-[hsl(var(--primary))]" checked={l.promoApplies} onChange={(e) => p.onLine("promo", i, { promoApplies: e.target.checked })} />
              {multi ? `Promo credit applies to line ${i + 1}` : "This line has a promo credit"}
            </label>
            {l.promoApplies && (
              <div className="flex gap-3">
                <Num id={`promo-amt-${i}`} label="Credit / month" money value={l.promoAmount} invalid={!isMoney(l.promoAmount)} onChange={(v) => p.onLine("promo", i, { promoAmount: v })} />
                <Num id={`promo-mo-${i}`} label="Months left" value={l.promoMonths} invalid={!isInt(l.promoMonths)} onChange={(v) => p.onLine("promo", i, { promoMonths: v })} />
              </div>
            )}
          </div>
        ))}
      </Fact>
      <Fact k="etf" title="Early termination fee" p={p} error="Enter a dollar amount, like 0.">
        <Num id="etf" label="Fee" money value={f.etf} invalid={!isMoney(f.etf)} onChange={(v) => p.onFact("etf", { etf: v })} />
      </Fact>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        <p aria-live="polite" data-testid="text-build-hint" className="text-sm text-muted-foreground empty:hidden">
          {!allValid ? "Fix the highlighted values first." : !allChecked ? `Check ${remaining} more ${remaining === 1 ? "fact" : "facts"} to build your brief.` : ""}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Btn variant="ghost" data-testid="button-back-bill" onClick={p.onBack}><ArrowLeft className="h-4 w-4" />Back</Btn>
          <Btn data-testid="button-build" disabled={!allChecked || !allValid} onClick={p.onBuild} className="flex-1 sm:flex-none">Build my switch brief</Btn>
        </div>
      </div>
    </div>
  );
}
