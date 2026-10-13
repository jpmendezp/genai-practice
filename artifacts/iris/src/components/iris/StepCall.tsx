import { useEffect, useReducer, useRef, useState } from "react";
import { FastForward, Pause, Phone, PhoneOff, Hourglass } from "lucide-react";
import type { Facts, Profile } from "@/lib/iris-data";
import { totals, usd } from "@/lib/iris-logic";
import { FINAL_BILL_DATE, HOLDER, buildScript, callReducer, canSkip, fmtClock, gateCopy, initCall, type CallResult, type Instructions } from "@/lib/call-machine";
import { Btn, Card } from "./ui";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

interface Props {
  facts: Facts;
  profile: Profile;
  ins: Instructions;
  onEnd: (notice: string | null) => void;
  onDone: (r: CallResult) => void;
}

const TICK = 250;
const speakerCls: Record<string, string> = {
  Iris: "bg-primary text-primary-foreground ml-8 rounded-br-md",
  "Carrier agent": "bg-card border border-card-border mr-8 rounded-bl-md",
  "Carrier bot": "bg-muted mr-8 rounded-bl-md",
};

export function StepCall({ facts, profile, ins, onEnd, onDone }: Props) {
  const [s, dispatch] = useReducer(callReducer, undefined, () => initCall(buildScript(profile, facts, ins)));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const holder = HOLDER[profile];
  const t = totals(facts);
  const pin = ins.goal === "pin";
  const ended = s.mode === "done" || s.mode === "expired";

  useEffect(() => {
    if (ended) return;
    const id = window.setInterval(() => dispatch({ type: "tick", dt: TICK }), TICK);
    return () => window.clearInterval(id);
  }, [ended]);

  useEffect(() => {
    if (s.mode !== "done" || !s.outcome) return;
    doneRef.current({ outcome: s.outcome, declined: s.declined, callMs: s.callMs, accepted: s.accepted });
  }, [s.mode, s.outcome, s.declined, s.callMs, s.accepted]);

  useEffect(() => {
    const el = logRef.current?.lastElementChild;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [s.lines.length]);

  const waiting = s.mode === "offer" || s.mode === "ring" || s.mode === "approve" || s.mode === "paused";
  const skipHint = waiting ? "Skip ahead is off while Iris waits for your decision." : s.phase >= 6 || (s.events[s.idx]?.phase ?? 7) >= 6 ? "Skip ahead is off while Iris gets your approval and wraps up." : null;

  return (
    <div className="rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Iris is calling</p>
          <h1 className="font-display text-[1.9rem] leading-tight sm:text-4xl" data-testid="text-carrier">{facts.carrier || "Your carrier"}</h1>
        </div>
        <p className="tnum font-display text-3xl" data-testid="text-elapsed" aria-label={`Elapsed ${fmtClock(s.callMs)}`}>{fmtClock(s.callMs)}</p>
      </div>

      <div role="status" aria-live="polite" data-testid="text-status" className={cn("flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold", s.status === "Waiting for you" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")}>
        <span className="relative flex h-2.5 w-2.5">
          {!ended && <span className="petal absolute inset-0 rounded-full bg-current" />}
          <span className="relative h-2.5 w-2.5 rounded-full bg-current opacity-70" />
        </span>
        {s.status}
        {s.status === "On hold" && <span className="font-normal opacity-80">· hold music playing</span>}
      </div>

      <Card className="p-3 sm:p-4">
        <h2 className="sr-only">Live transcript</h2>
        <ol ref={logRef} aria-live="polite" aria-relevant="additions" className="max-h-[52dvh] min-h-48 space-y-3 overflow-y-auto p-1" data-testid="list-transcript">
          {s.lines.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">Dialing {facts.carrier || "your carrier"}...</li>}
          {s.lines.map((l) => (
            <li key={l.id} className="rise" data-testid={`row-line-${l.id}`}>
              <p className={cn("mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground", l.speaker === "Iris" && "text-right")}>{l.speaker}</p>
              <p className={cn("rounded-2xl px-4 py-3 leading-relaxed", speakerCls[l.speaker])}>{l.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      {s.mode === "offer" && s.gate && (
        <Card className="rise space-y-4 border-[hsl(42_70%_65%)] bg-accent" >
          <p id="gate-text" role="alert" className="text-lg font-semibold leading-snug text-accent-foreground" data-testid="text-offer-gate">{gateCopy(s.gate.offer)}</p>
          <p className="text-sm text-accent-foreground/80">The call is paused until you choose. Accepting keeps your service and stops {pin ? "the PIN request" : "the cancellation"}.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Btn data-testid="button-offer-decline" onClick={() => dispatch({ type: "offer", accept: false })} className="flex-1">Decline</Btn>
            <Btn variant="ghost" data-testid="button-offer-accept" onClick={() => dispatch({ type: "offer", accept: true })} className="flex-1">Accept</Btn>
          </div>
        </Card>
      )}

      {s.mode === "paused" && (
        <Card className="rise space-y-3 border-[hsl(42_70%_65%)]">
          <p className="flex items-center gap-2 font-semibold"><Pause className="h-4 w-4" />Iris will keep the line on hold for 2 minutes</p>
          <p className="text-sm text-muted-foreground">Nothing is final yet. Time left: <span className="tnum font-semibold text-foreground" data-testid="text-hold-left">{fmtClock(s.holdLeft + 999)}</span></p>
          <Btn data-testid="button-answer-again" onClick={() => dispatch({ type: "answer" })} className="w-full sm:w-auto"><Phone className="h-4 w-4" />Answer again</Btn>
        </Card>
      )}

      {s.mode === "expired" && (
        <Card className="rise space-y-3">
          <p className="flex items-center gap-2 font-semibold"><Hourglass className="h-4 w-4" />The hold time ran out.</p>
          <p className="text-sm text-muted-foreground">Iris ended the call without approving anything. Nothing was {pin ? "issued" : "cancelled"}. You can review your instructions and try again.</p>
          <Btn data-testid="button-retry" onClick={() => onEnd("The last call ended after 2 minutes on hold without your approval. Nothing changed on your account. You can try again.")}>Back to instructions</Btn>
        </Card>
      )}

      {!ended && (
        <div className="space-y-2">
          {skipHint && <p className="text-sm text-muted-foreground" data-testid="text-skip-hint">{skipHint}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Btn variant="soft" data-testid="button-skip" disabled={!canSkip(s)} onClick={() => dispatch({ type: "skip" })} className="flex-1 sm:flex-none"><FastForward className="h-4 w-4" />Skip ahead</Btn>
            {s.phase < 7 && <Btn variant="ghost" data-testid="button-end-call" onClick={() => setConfirmEnd(true)} className="text-destructive"><PhoneOff className="h-4 w-4" />End call</Btn>}
          </div>
        </div>
      )}

      {(s.mode === "ring" || s.mode === "approve") && !confirmEnd && (
        <Modal full labelledBy="approve-title" describedBy="approve-desc" className="flex min-h-[100dvh] flex-col items-center bg-[hsl(232_30%_16%)] px-6 pb-10 pt-20 text-[hsl(40_40%_94%)]">
          {s.mode === "ring" ? (
            <div className="flex w-full max-w-sm flex-1 flex-col items-center text-center">
              <p className="text-xs font-bold uppercase tracking-[.2em] opacity-70">Simulated incoming call</p>
              <div className="relative mt-10 grid h-28 w-28 place-items-center rounded-full bg-primary">
                <span className="petal absolute inset-[-10px] rounded-full border-2 border-[hsl(42_85%_55%)]" />
                <span className="font-display text-4xl">Iris</span>
              </div>
              <p className="tnum mt-6 opacity-70">{ins.phone}</p>
              <h2 id="approve-title" className="mt-4 font-display text-3xl leading-tight">Iris is calling.</h2>
              <p id="approve-desc" className="mt-2 text-lg leading-snug opacity-90">{pin ? "Your carrier is ready to issue your number transfer PIN." : "Your carrier is ready to cancel."} Pick up to approve.</p>
              <div className="mt-auto grid w-full grid-cols-2 gap-6 pt-10">
                <button data-testid="button-call-decline" onClick={() => dispatch({ type: "hold" })} className="flex flex-col items-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(42_85%_55%)] rounded-2xl p-2">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-destructive"><PhoneOff className="h-7 w-7" /></span>Decline
                </button>
                <button data-autofocus data-testid="button-call-answer" onClick={() => dispatch({ type: "answer" })} className="flex flex-col items-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(42_85%_55%)] rounded-2xl p-2">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(168_40%_38%)]"><Phone className="h-7 w-7" /></span>Answer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-sm flex-1 flex-col">
              <p className="text-xs font-bold uppercase tracking-[.2em] opacity-70">On the line with Iris</p>
              <h2 id="approve-title" className="mt-3 font-display text-3xl leading-tight">{holder.first}, do you approve?</h2>
              <ul id="approve-desc" className="mt-6 space-y-3 rounded-2xl bg-[hsl(232_26%_22%)] p-5 leading-snug" data-testid="list-approval">
                <li>{pin ? `${facts.carrier} issues your number transfer PIN for ${facts.lines} line${facts.lines === "1" ? "" : "s"}. Your service stays active until your number moves.` : `${facts.carrier} cancels all ${facts.lines} line${facts.lines === "1" ? "" : "s"} on your ${facts.plan} plan.`}</li>
                {!pin && <li className="text-[hsl(42_85%_70%)]">Cancellation ends service and may prevent keeping your number. To keep your number, choose the transfer PIN goal instead.</li>}
                <li>Cost to leave: <span className="tnum font-semibold">{usd(t.exit)}</span></li>
                <li>Final bill date: <span className="font-semibold">{FINAL_BILL_DATE}</span> <span className="text-sm opacity-70">(simulated sample)</span></li>
              </ul>
              <div className="mt-auto space-y-3 pt-8">
                <button data-autofocus data-testid="button-approve" onClick={() => dispatch({ type: "approve" })} className="min-h-16 w-full rounded-full bg-[hsl(42_85%_58%)] text-xl font-bold text-[hsl(232_30%_16%)] transition-transform active:scale-[.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(40_40%_94%)] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(232_30%_16%)]">I approve</button>
                <button data-testid="button-not-now" onClick={() => dispatch({ type: "hold" })} className="min-h-12 w-full rounded-full border border-[hsl(40_40%_94%/.35)] font-semibold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(42_85%_55%)]">Not now</button>
              </div>
            </div>
          )}
          <button data-testid="button-end-call-overlay" onClick={() => setConfirmEnd(true)} className="mt-6 text-sm font-semibold underline underline-offset-4 opacity-80 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(42_85%_55%)] rounded">End call</button>
        </Modal>
      )}

      {confirmEnd && (
        <Modal labelledBy="end-title" describedBy="end-desc" onEscape={() => setConfirmEnd(false)} className="w-full max-w-sm rounded-[var(--radius)] border border-card-border bg-card p-6 shadow-xl">
          <h2 id="end-title" className="font-display text-2xl">End the call?</h2>
          <p id="end-desc" className="mt-2 text-muted-foreground">Iris will hang up. Nothing has been approved, so nothing changes on your account. Your instructions are kept.</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Btn variant="ghost" data-autofocus data-testid="button-end-cancel" onClick={() => setConfirmEnd(false)}>Keep calling</Btn>
            <Btn data-testid="button-end-confirm" onClick={() => onEnd("You ended the call. Nothing was approved or changed. Your instructions are still here.")} className="bg-destructive">End call</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
