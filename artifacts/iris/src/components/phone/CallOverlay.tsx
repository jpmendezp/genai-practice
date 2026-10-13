import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Clock, Phone, PhoneOff } from "lucide-react";
import { Avatar } from "./Avatar";
import { clock, useNow } from "@/hooks/use-iris";

export function CallOverlay({ mode, caption, onAccept, onDecline, onApprove, onNotYet }: {
  mode: "ring" | "incall"; caption: string; onAccept: () => void; onDecline: () => void; onApprove: () => void; onNotYet: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inSince, setInSince] = useState(0);
  const now = useNow(mode === "incall");
  const words = caption.split(" ");
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    if (mode !== "incall") return;
    setInSince(Date.now());
    if (reduce) { setShown(words.length); return; }
    setShown(0);
    const id = setInterval(() => setShown((n) => { if (n >= words.length) { clearInterval(id); return n; } return n + 1; }), 110);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, caption]);
  const done = shown >= words.length;

  return (
    <div
      ref={ref} role="dialog" aria-modal="true" aria-labelledby="call-title" aria-describedby="call-desc"
      className="fade-in absolute inset-0 z-50 flex flex-col items-center bg-[linear-gradient(170deg,hsl(222_28%_22%),hsl(225_30%_9%))] px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-16 text-[hsl(220_30%_96%)]"
      data-testid="overlay-call"
    >
      <p className="text-[13px] font-medium text-[hsl(220_20%_75%)]">{mode === "ring" ? "Incoming call" : clock(now - (inSince || now))}</p>
      <div className="relative mt-8">
        {mode === "ring" && (
          <>
            <span className="ripple absolute inset-0 rounded-full bg-[hsl(var(--live))]" />
            <span className="ripple absolute inset-0 rounded-full bg-[hsl(var(--live))] [animation-delay:.6s]" />
          </>
        )}
        <Avatar size={104} />
      </div>
      <h2 id="call-title" className="mt-5 text-[30px] font-semibold tracking-tight">Iris</h2>
      {mode === "ring" ? (
        <p id="call-desc" className="mt-2 max-w-[260px] text-center text-[16px] leading-snug text-[hsl(220_20%_82%)]" data-testid="text-ring">
          Your carrier is ready. Pick up to approve.
        </p>
      ) : (
        <div className="mt-6 w-full rounded-3xl bg-[hsl(220_30%_100%/.08)] p-4" aria-live="polite">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[hsl(220_20%_70%)]">Live captions</p>
          <p id="call-desc" className="sr-only">{caption}</p>
          <p className="text-[17px] leading-snug" aria-hidden data-testid="text-caption">
            {words.slice(0, shown).join(" ")}
            {!done && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current opacity-70" />}
          </p>
        </div>
      )}

      <div className="mt-auto flex w-full justify-around">
        {mode === "ring" ? (
          <>
            <RoundBtn label="Decline" color="bg-[hsl(var(--destructive))]" onClick={onDecline} testId="button-decline-call"><PhoneOff className="h-7 w-7" /></RoundBtn>
            <RoundBtn label="Accept" color="bg-[hsl(var(--live))]" onClick={onAccept} testId="button-accept-call" autoFocus>
              <Phone className="wiggle h-7 w-7" />
            </RoundBtn>
          </>
        ) : (
          <>
            <RoundBtn label="Not yet" color="bg-[hsl(220_20%_100%/.18)]" onClick={onNotYet} testId="button-not-yet"><Clock className="h-7 w-7" /></RoundBtn>
            <RoundBtn label="Approve" color="bg-[hsl(var(--live))]" onClick={onApprove} testId="button-approve" autoFocus><Check className="h-8 w-8" strokeWidth={2.6} /></RoundBtn>
          </>
        )}
      </div>
    </div>
  );
}

function RoundBtn({ label, color, onClick, children, testId, autoFocus }: { label: string; color: string; onClick: () => void; children: ReactNode; testId: string; autoFocus?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={onClick} aria-label={label} data-autofocus={autoFocus ? "" : undefined} data-testid={testId}
        className={`grid h-[72px] w-[72px] place-items-center rounded-full text-white transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${color}`}>
        {children}
      </button>
      <span className="text-[13px] font-medium">{label}</span>
    </div>
  );
}
