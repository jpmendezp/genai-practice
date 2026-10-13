import { useRef, useState } from "react";
import { Check, Copy, RotateCcw, ArrowLeft } from "lucide-react";
import type { Facts } from "@/lib/iris-data";
import { totals, usd } from "@/lib/iris-logic";
import { FINAL_BILL_DATE, SAMPLE_PIN, confNumber, fmtClock, offerText, type CallResult } from "@/lib/call-machine";
import { Btn, Card } from "./ui";
import { cn } from "@/lib/utils";

export const DONE_CHECKLIST = ["Save your confirmation number", "Keep your phone on until your number transfers", "Check your final bill"];

interface Props { facts: Facts; result: CallResult; checklist: boolean[]; onChecklist: (i: number, v: boolean) => void; onInstructions: () => void; onRestart: () => void }

export function resultView(f: Facts, r: CallResult) {
  const t = totals(f);
  const kept = r.outcome === "kept";
  const goal = r.outcome === "cancelled" ? "Service cancelled" : r.outcome === "pin" ? "Number transfer PIN issued. Service is still active." : `You kept your service with ${r.accepted ? offerText(r.accepted) : "an offer"}. Nothing was cancelled.`;
  const rows: [string, string][] = [
    ["Confirmation number", confNumber(r.outcome)],
    ...(r.outcome === "pin" ? [["Number transfer PIN", SAMPLE_PIN] as [string, string]] : []),
    ...(kept && r.accepted ? [["Accepted offer", offerText(r.accepted)] as [string, string]] : []),
    [kept ? "Cost if you leave later" : "Cost to leave", usd(t.exit)],
    ["Final bill date", kept ? "N/A, service active" : `${FINAL_BILL_DATE} (simulated)`],
  ];
  const notes = r.outcome === "cancelled"
    ? "Cancelling ends service on this number. If you meant to switch carriers, port your number first next time."
    : kept ? "Your plan stays the same with the discount added. You can still switch later." : "Give the PIN and your account number to your new carrier. Your old service ends once the transfer completes.";
  return { goal, rows, notes, summary: `Call lasted ${fmtClock(r.callMs)}. Iris declined ${r.declined} offer${r.declined === 1 ? "" : "s"}.` };
}

export function StepDone({ facts, result, checklist, onChecklist, onInstructions, onRestart }: Props) {
  const v = resultView(facts, result);
  const [copy, setCopy] = useState<"idle" | "ok" | "fail">("idle");
  const fbRef = useRef<HTMLTextAreaElement>(null);
  const text = [
    "IRIS CALL RESULT (simulated prototype)",
    `${facts.carrier} - ${facts.plan}`,
    v.goal,
    ...v.rows.map(([k, val]) => `${k}: ${val}`),
    v.summary,
    v.notes,
    "",
    "CHECKLIST",
    ...DONE_CHECKLIST.map((c, i) => `[${checklist[i] ? "x" : " "}] ${c}`),
  ].join("\n");

  const doCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("blocked");
      await navigator.clipboard.writeText(text);
      setCopy("ok");
      window.setTimeout(() => setCopy((c) => (c === "ok" ? "idle" : c)), 2200);
    } catch {
      setCopy("fail");
      window.setTimeout(() => { fbRef.current?.focus(); fbRef.current?.select(); }, 50);
    }
  };

  return (
    <div className="rise space-y-4">
      <h1 className="font-display text-[1.9rem] leading-tight sm:text-4xl">{result.outcome === "kept" ? "You stayed, on better terms." : "Done. Iris handled it."}</h1>
      <p className="text-muted-foreground" data-testid="text-goal-result">{v.goal}</p>

      <Card className="overflow-hidden border-0 bg-primary p-0 text-primary-foreground">
        <dl className="divide-y divide-[hsl(40_40%_98%/.15)]">
          {v.rows.map(([k, val], i) => (
            <div key={k} className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 py-4", i === 0 && "py-6")}>
              <dt className="text-sm font-semibold opacity-80">{k}</dt>
              <dd className={cn("tnum font-display", i === 0 ? "text-3xl" : "text-xl")} data-testid={`text-result-${i}`}>{val}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <p className="text-sm text-muted-foreground" data-testid="text-summary">{v.summary} All numbers here are fictional.</p>
      <p className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">{v.notes}</p>

      <Card className="space-y-2">
        <h2 className="font-display text-xl">Before you go</h2>
        {DONE_CHECKLIST.map((c, i) => (
          <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" data-testid={`check-done-${i}`} checked={checklist[i]} onChange={(e) => onChecklist(i, e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
            <span className={cn(checklist[i] && "text-muted-foreground line-through")}>{c}</span>
          </label>
        ))}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Btn data-testid="button-copy" onClick={doCopy} className="flex-1 sm:flex-none">{copy === "ok" ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy summary</>}</Btn>
        <Btn variant="ghost" data-testid="button-instructions" onClick={onInstructions}><ArrowLeft className="h-4 w-4" />Back to instructions</Btn>
        <Btn variant="ghost" data-testid="button-restart" onClick={onRestart}><RotateCcw className="h-4 w-4" />Start over</Btn>
      </div>
      <p aria-live="polite" className="sr-only">{copy === "ok" ? "Copied" : ""}</p>
      {copy === "fail" && (
        <div className="space-y-2">
          <p role="alert" className="text-sm font-medium">Your browser blocked copying. Select the text below and copy it yourself.</p>
          <textarea ref={fbRef} readOnly value={text} rows={12} data-testid="text-copy-fallback" className="w-full rounded-xl border border-input bg-card p-3 font-mono text-sm" />
        </div>
      )}
    </div>
  );
}
