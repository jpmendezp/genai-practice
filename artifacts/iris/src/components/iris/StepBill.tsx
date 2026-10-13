import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { CARRIERS, SAMPLES, type Profile } from "@/lib/iris-data";
import { Btn, Card, inputCls } from "./ui";
import { cn } from "@/lib/utils";

interface Props {
  carrier: string;
  text: string;
  sample: Profile | null;
  error: string | null;
  reading: boolean;
  onCarrier: (v: string) => void;
  onText: (v: string) => void;
  onSample: (id: Profile) => void;
  onRead: () => void;
}

export function StepBill(p: Props) {
  const [open, setOpen] = useState(false);
  if (p.reading)
    return (
      <Card className="rise flex flex-col items-center gap-5 py-16 text-center">
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="petal h-3 w-3 rounded-full bg-primary" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <p role="status" aria-live="polite" className="font-display text-xl" data-testid="status-reading">
          Iris is reading your bill...
        </p>
      </Card>
    );
  return (
    <div className="rise space-y-6">
      <h1 className="font-display text-[1.9rem] leading-[1.15] sm:text-4xl text-balance">
        See what it really costs to leave your carrier, and walk in prepared.
      </h1>
      <Card className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="carrier" className="block text-sm font-semibold">Your current carrier</label>
          <div className="relative">
            <select id="carrier" data-testid="select-carrier" value={p.carrier} onChange={(e) => p.onCarrier(e.target.value)} className={cn(inputCls, "appearance-none pr-10")}>
              <option value="">Choose a carrier</option>
              {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="bill" className="block text-sm font-semibold">Paste your bill or plan details</label>
          <textarea
            id="bill"
            data-testid="input-bill"
            rows={9}
            value={p.text}
            onChange={(e) => p.onText(e.target.value)}
            aria-invalid={!!p.error}
            aria-describedby="bill-error"
            placeholder="Copy the part of your bill that lists your plan, device payments and credits."
            className={cn(inputCls, "min-h-52 py-3 font-mono text-[14px] leading-relaxed")}
          />
          <p id="bill-error" role="alert" aria-live="assertive" data-testid="text-bill-error" className="text-sm font-medium text-destructive empty:hidden">
            {p.error}
          </p>
        </div>
        <div>
          <button type="button" data-testid="button-sample" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <FileText className="h-4 w-4" /> Use a sample bill
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <ul className="rise mt-2 grid gap-2">
              {SAMPLES.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    data-testid={`button-sample-${s.id}`}
                    onClick={() => { p.onSample(s.id); setOpen(false); }}
                    className={cn("flex w-full min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40", p.sample === s.id ? "border-primary bg-secondary" : "border-border")}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-display text-primary-foreground">{s.id}</span>
                    <span><span className="block font-semibold">{s.label}</span><span className="block text-sm text-muted-foreground">{s.detail}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Btn data-testid="button-read" onClick={p.onRead} className="w-full sm:w-auto">Read my bill</Btn>
    </div>
  );
}
