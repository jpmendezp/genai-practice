import { useEffect, useRef, useState } from "react";
import { SAMPLES, factsFor, type Facts, type LineFacts, type Profile } from "@/lib/iris-data";
import { FACT_KEYS, MAX_LINES, checkBill, isInt, isUnsupported, matchProfile, resizeLines, type FactKey } from "@/lib/iris-logic";
import { StepBill } from "@/components/iris/StepBill";
import { StepFacts } from "@/components/iris/StepFacts";
import { StepBrief } from "@/components/iris/StepBrief";
import { cn } from "@/lib/utils";

const noChecks = () => Object.fromEntries(FACT_KEYS.map((k) => [k, false])) as Record<FactKey, boolean>;
const STEPS = ["Your bill", "Confirm facts", "Your switch brief"];

function App() {
  const [step, setStep] = useState(1);
  const [carrier, setCarrier] = useState("");
  const [text, setText] = useState("");
  const [sample, setSample] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [profile, setProfile] = useState<Profile>("A");
  const [facts, setFacts] = useState<Facts>(factsFor("A"));
  const [checks, setChecks] = useState(noChecks);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false, false]);
  const [outcome, setOutcome] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [step]);

  const read = () => {
    const e = checkBill(text);
    if (e === "empty") return setError("Paste your bill or choose a sample bill first.");
    if (e === "unreadable")
      return setError("Iris couldn't find plan details in this text. Try pasting the section that shows your monthly charges and device payments, or use a sample bill.");
    setError(null);
    setReading(true);
    timer.current = window.setTimeout(() => {
      const prof = matchProfile(text, carrier, sample);
      const f = factsFor(prof);
      if (isUnsupported(carrier)) f.carrier = carrier;
      setProfile(prof);
      setFacts(f);
      setChecks(noChecks());
      setReading(false);
      setStep(2);
    }, 1500);
  };

  const onFact = (k: FactKey, patch: Partial<Facts>) => {
    setFacts((f) => {
      const next = { ...f, ...patch };
      if (patch.lines !== undefined && isInt(patch.lines, 1, MAX_LINES)) next.perLine = resizeLines(f.perLine, Number(patch.lines));
      return next;
    });
    setChecks((c) => ({ ...c, [k]: false, ...(k === "lines" ? { devices: false, promo: false } : {}) }));
  };
  const onLine = (k: FactKey, i: number, patch: Partial<LineFacts>) => {
    setFacts((f) => ({ ...f, perLine: f.perLine.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
    setChecks((c) => ({ ...c, [k]: false }));
  };

  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    setStep(1); setCarrier(""); setText(""); setSample(null); setError(null); setReading(false);
    setProfile("A"); setFacts(factsFor("A")); setChecks(noChecks()); setChecklist([false, false, false, false, false]); setOutcome(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div role="note" className="bg-[hsl(232_30%_16%)] px-4 py-2 text-center text-xs font-medium leading-snug text-[hsl(40_40%_94%)]" data-testid="text-banner">
        Prototype: bill reading and briefs are prewritten examples, not live AI analysis.
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-10">
        <header className="flex items-center gap-2.5 py-5">
          <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
            <ellipse cx="16" cy="10" rx="5" ry="9" fill="hsl(var(--primary))" />
            <ellipse cx="16" cy="10" rx="5" ry="9" fill="hsl(var(--primary))" opacity=".55" transform="rotate(-62 16 16)" />
            <ellipse cx="16" cy="10" rx="5" ry="9" fill="hsl(42 85% 55%)" opacity=".8" transform="rotate(62 16 16)" />
          </svg>
          <span className="font-display text-2xl">Iris</span>
        </header>

        <nav aria-label="Progress" className="mb-7">
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.map((s, i) => {
              const n = i + 1;
              return (
                <li key={s} aria-current={step === n ? "step" : undefined} className="space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full origin-left rounded-full bg-primary transition-transform duration-500", step >= n ? "scale-x-100" : "scale-x-0")} />
                  </div>
                  <p className={cn("text-xs sm:text-sm", step === n ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    <span className="tnum">{n}</span> {s}
                  </p>
                </li>
              );
            })}
          </ol>
        </nav>

        <main ref={mainRef} tabIndex={-1} className="outline-none">
          {step === 1 && (
            <StepBill
              carrier={carrier} text={text} sample={sample} error={error} reading={reading}
              onCarrier={(v) => { setCarrier(v); setSample(null); setError(null); }}
              onText={(v) => { setText(v); setSample(null); setError(null); }}
              onSample={(id) => { const s = SAMPLES.find((x) => x.id === id)!; setText(s.text); setCarrier(s.carrier); setSample(id); setError(null); }}
              onRead={read}
            />
          )}
          {step === 2 && (
            <StepFacts
              facts={facts} profile={profile} unsupported={isUnsupported(carrier)} checks={checks}
              onFact={onFact} onLine={onLine} onCheck={(k, v) => setChecks((c) => ({ ...c, [k]: v }))}
              onBack={() => setStep(1)} onBuild={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepBrief
              facts={facts} profile={profile} checklist={checklist}
              onChecklist={(i, v) => setChecklist((c) => c.map((x, j) => (j === i ? v : x)))}
              outcome={outcome} onOutcome={setOutcome}
              onBackFacts={() => setStep(2)} onRestart={restart}
            />
          )}
        </main>

        <footer className="mt-12 border-t border-border pt-5 text-sm text-muted-foreground">
          Iris doesn't contact your carrier for you and isn't legal advice. It explains what your own bill says.
        </footer>
      </div>
    </div>
  );
}

export default App;
