import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Phone, RotateCcw, ShieldCheck, ShieldQuestion } from "lucide-react";
import { CHECKLIST, OFFERS, type Facts, type Profile } from "@/lib/iris-data";
import { breakdown, briefText, contactInfo, script, totals, usd } from "@/lib/iris-logic";
import { Btn, Card } from "./ui";
import { cn } from "@/lib/utils";

interface Props {
  facts: Facts;
  profile: Profile;
  checklist: boolean[];
  onChecklist: (i: number, v: boolean) => void;
  outcome: string | null;
  onOutcome: (o: string) => void;
  onBackFacts: () => void;
  onRestart: () => void;
}

const OUTCOMES = ["Switched successfully", "They kept me with an offer", "Still stuck"];

function H({ children }: { children: string }) {
  return <h2 className="font-display text-xl">{children}</h2>;
}

export function StepBrief(p: Props) {
  const t = totals(p.facts);
  const contact = contactInfo(p.facts.carrier);
  const lines = script(p.profile, p.facts);
  const text = useMemo(() => briefText(p.profile, p.facts, p.checklist), [p.profile, p.facts, p.checklist]);
  const [copy, setCopy] = useState<"idle" | "ok" | "fail">("idle");
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  const doCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setCopy("ok");
      setTimeout(() => setCopy((c) => (c === "ok" ? "idle" : c)), 2200);
    } catch {
      setCopy("fail");
      setTimeout(() => { fallbackRef.current?.focus(); fallbackRef.current?.select(); }, 50);
    }
  };

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-[1.9rem] leading-tight sm:text-4xl">Your switch brief</h1>
      <p className="text-muted-foreground">{p.facts.carrier} &middot; {p.facts.plan}</p>

      <Card className="overflow-hidden border-0 bg-primary p-0 text-primary-foreground">
        <div className="p-6 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-75">Cost to leave today</p>
          <p className="tnum font-display text-5xl sm:text-6xl mt-1" data-testid="text-exit-cost" aria-live="polite">
            <span className="sr-only">Cost to leave today: </span>{usd(t.exit)}
          </p>
          <p className="mt-3 text-sm leading-relaxed opacity-85" data-testid="text-breakdown">{breakdown(p.facts)}</p>
        </div>
        <div className="flex items-baseline justify-between gap-3 bg-[hsl(246_38%_34%)] px-6 py-4 sm:px-7">
          <span className="text-sm font-semibold">Credits you give up</span>
          <span className="tnum font-display text-2xl" data-testid="text-credits">{usd(t.giveUp)}</span>
        </div>
      </Card>
      <p className="text-sm text-muted-foreground">Credits aren't a charge. They're discounts you stop receiving once you leave.</p>

      <Card className="space-y-3">
        <H>How to contact them</H>
        <span data-testid="text-verification" className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", contact.verified ? "bg-[hsl(168_40%_92%)] text-[hsl(168_45%_22%)]" : "bg-accent text-accent-foreground")}>
          {contact.verified ? <ShieldCheck className="h-4 w-4" /> : <ShieldQuestion className="h-4 w-4" />}{contact.label}
        </span>
        <p className="flex gap-3 leading-relaxed"><Phone className="mt-1 h-4 w-4 shrink-0 text-primary" />{contact.text}</p>
      </Card>

      <Card className="space-y-3">
        <H>What to say</H>
        <ol className="space-y-2.5 border-l-2 border-primary/30 pl-4" data-testid="list-script">
          {lines.map((l, i) => <li key={i} className="leading-relaxed">"{l}"</li>)}
        </ol>
      </Card>

      <Card className="space-y-3">
        <H>Offers they'll likely make, and how to decline</H>
        <ul className="divide-y divide-border">
          {OFFERS.map((o, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="font-semibold">{o.offer}</p>
              <p className="mt-1 text-muted-foreground">You: "{o.decline}"</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2">
        <H>Checklist</H>
        <ul>
          {CHECKLIST.map((c, i) => (
            <li key={c}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3">
                <input type="checkbox" data-testid={`check-list-${i}`} className="h-5 w-5 accent-[hsl(var(--primary))]" checked={p.checklist[i]} onChange={(e) => p.onChecklist(i, e.target.checked)} />
                <span className={cn("transition-colors", p.checklist[i] && "text-muted-foreground line-through")}>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-2">
        <Btn data-testid="button-copy" onClick={doCopy} className="w-full sm:w-auto">
          {copy === "ok" ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy brief</>}
        </Btn>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
          {copy === "ok" ? "Copied" : copy === "fail" ? "Your browser blocked copying. The brief is selected below, so you can copy it by hand." : ""}
        </p>
        {copy === "fail" && (
          <textarea ref={fallbackRef} readOnly aria-label="Brief text to copy" data-testid="text-brief-fallback" value={text} rows={12} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-input bg-card p-3 font-mono text-xs" />
        )}
      </div>

      <Card className="space-y-3">
        <H>How did it go?</H>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <Btn key={o} variant={p.outcome === o ? "primary" : "soft"} aria-pressed={p.outcome === o} data-testid={`button-outcome-${o.split(" ")[0].toLowerCase()}`} onClick={() => p.onOutcome(o)}>{o}</Btn>
          ))}
        </div>
        <p role="status" aria-live="polite" className="text-sm empty:hidden">
          {p.outcome ? "Thanks for telling us. Nothing is saved; this stays on your screen only." : ""}
        </p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Btn variant="ghost" data-testid="button-back-facts" onClick={p.onBackFacts}><ArrowLeft className="h-4 w-4" />Back to facts</Btn>
        <Btn variant="ghost" data-testid="button-restart" onClick={p.onRestart}><RotateCcw className="h-4 w-4" />Start over</Btn>
      </div>
    </div>
  );
}
