import { useState, type ReactNode } from "react";
import { ArrowLeft, PhoneOutgoing } from "lucide-react";
import type { Facts } from "@/lib/iris-data";
import { isMoney, num, totals, usd } from "@/lib/iris-logic";
import type { Instructions } from "@/lib/call-machine";
import { Btn, Card, inputCls } from "./ui";
import { cn } from "@/lib/utils";

interface Props {
  facts: Facts;
  ins: Instructions;
  notice: string | null;
  onChange: (patch: Partial<Instructions>) => void;
  onBack: () => void;
  onStart: () => void;
}

export const phoneDigits = (v: string) => v.replace(/\D/g, "");
export const thresholdError = (ins: Instructions) =>
  ins.rule === "ask" && (!isMoney(ins.threshold) || num(ins.threshold) <= 0) ? "Enter a dollar amount greater than 0, like 15." : null;
export const phoneError = (ins: Instructions) => (phoneDigits(ins.phone).length !== 10 ? "Enter a 10-digit US phone number." : null);

function Radio({ name, value, checked, onChange, children, testId }: { name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode; testId: string }) {
  return (
    <label className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors focus-within:ring-[3px] focus-within:ring-ring/30", checked ? "border-primary bg-secondary" : "border-input bg-background hover:bg-muted")}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} data-testid={testId} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
      <span className="min-w-0 flex-1 font-medium leading-snug">{children}</span>
    </label>
  );
}

export function StepInstructions({ facts, ins, notice, onChange, onBack, onStart }: Props) {
  const t = totals(facts);
  const [tried, setTried] = useState(false);
  const tErr = thresholdError(ins);
  const pErr = phoneError(ins);

  const start = () => {
    setTried(true);
    if (tErr || pErr || !ins.consent) {
      document.getElementById(tErr ? "threshold" : "phone")?.focus();
      return;
    }
    onStart();
  };

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-[1.9rem] leading-tight sm:text-4xl">Tell Iris how to handle the call.</h1>
      <p className="text-muted-foreground">Iris will do the waiting and the talking. You make the decisions that matter.</p>

      {notice && (
        <div role="status" data-testid="text-call-notice" className="rounded-xl border border-[hsl(42_70%_70%)] bg-accent p-4 text-sm font-medium text-accent-foreground">{notice}</div>
      )}

      <Card className="overflow-hidden border-0 bg-primary p-0 text-primary-foreground">
        <div className="p-6">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-75">Cost to leave today</p>
          <p className="tnum mt-1 font-display text-5xl" data-testid="text-exit-cost">{usd(t.exit)}</p>
        </div>
        <div className="flex items-baseline justify-between gap-3 bg-[hsl(246_38%_34%)] px-6 py-4">
          <span className="text-sm font-semibold">Credits you give up</span>
          <span className="tnum font-display text-2xl" data-testid="text-credits">{usd(t.giveUp)}</span>
        </div>
      </Card>

      <Card>
        <fieldset className="space-y-2.5">
          <legend className="mb-3 font-display text-xl">What should Iris get done?</legend>
          <Radio name="goal" value="cancel" testId="radio-goal-cancel" checked={ins.goal === "cancel"} onChange={() => onChange({ goal: "cancel" })}>Cancel my service</Radio>
          <Radio name="goal" value="pin" testId="radio-goal-pin" checked={ins.goal === "pin"} onChange={() => onChange({ goal: "pin" })}>Get my number transfer PIN so I can switch</Radio>
        </fieldset>
      </Card>

      <Card>
        <fieldset className="space-y-2.5">
          <legend className="mb-1 font-display text-xl">When they try to keep you</legend>
          <p className="mb-3 text-sm text-muted-foreground">Carriers usually make a few offers before they let you go.</p>
          <Radio name="rule" value="decline" testId="radio-rule-decline" checked={ins.rule === "decline"} onChange={() => onChange({ rule: "decline" })}>Decline all offers</Radio>
          <Radio name="rule" value="ask" testId="radio-rule-ask" checked={ins.rule === "ask"} onChange={() => onChange({ rule: "ask" })}>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-2">
              Ask me if they offer more than
              <span className="relative inline-block w-24">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  id="threshold" aria-label="Offer threshold in dollars per month" inputMode="decimal" data-testid="input-threshold"
                  value={ins.threshold} aria-invalid={!!(tErr && tried)} aria-describedby={tErr ? "threshold-error" : undefined}
                  onFocus={() => ins.rule !== "ask" && onChange({ rule: "ask" })}
                  onChange={(e) => onChange({ threshold: e.target.value.replace(/[^\d.]/g, ""), rule: "ask" })}
                  className={cn(inputCls, "tnum min-h-10 pl-6")}
                />
              </span>
              off per month
            </span>
          </Radio>
          {tErr && (tried || ins.threshold !== "") && <p id="threshold-error" role="alert" className="text-sm font-medium text-destructive">{tErr}</p>}
        </fieldset>
      </Card>

      <Card className="space-y-2">
        <label htmlFor="phone" className="block font-semibold">Iris will call you here when it's time to approve.</label>
        <input
          id="phone" type="tel" inputMode="tel" autoComplete="tel" data-testid="input-phone" className={cn(inputCls, "tnum")}
          value={ins.phone} aria-invalid={!!(pErr && tried)} aria-describedby={pErr ? "phone-error" : undefined}
          onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d()\-\s+]/g, "") })}
        />
        {pErr && tried && <p id="phone-error" role="alert" className="text-sm font-medium text-destructive">{pErr}</p>}
      </Card>

      <label className={cn("flex cursor-pointer gap-3 rounded-[var(--radius)] border p-4 transition-colors", ins.consent ? "border-[hsl(168_35%_38%)] bg-[hsl(168_40%_95%)]" : "border-card-border bg-card")}>
        <input type="checkbox" required data-testid="check-consent" checked={ins.consent} onChange={(e) => onChange({ consent: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
        <span className="font-medium leading-snug">I authorize Iris to speak to my carrier on my behalf. Iris will not approve anything final without me.</span>
      </label>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        {!ins.consent && <p className="text-sm text-muted-foreground" data-testid="text-start-hint">Check the authorization box to continue.</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Btn variant="ghost" data-testid="button-back-facts" onClick={onBack}><ArrowLeft className="h-4 w-4" />Back to facts</Btn>
          <Btn data-testid="button-start-call" disabled={!ins.consent} onClick={start} className="flex-1 sm:flex-none"><PhoneOutgoing className="h-4 w-4" />Let Iris make the call</Btn>
        </div>
      </div>
    </div>
  );
}
