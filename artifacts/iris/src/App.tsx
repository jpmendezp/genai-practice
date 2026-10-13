import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BatteryFull, RotateCcw, Signal, Wifi } from "lucide-react";
import { useIris, useNow, clock } from "@/hooks/use-iris";
import type { IrisController, IrisState, Msg } from "@/lib/chat-engine";
import { billAlt, billSvg } from "@/lib/bill-svg";
import { Avatar } from "@/components/phone/Avatar";
import { BillCard, CopyCard, ResultCard } from "@/components/phone/Cards";
import { SampleSheet, TranscriptSheet } from "@/components/phone/Sheets";
import { CallOverlay } from "@/components/phone/CallOverlay";
import { cn } from "@/lib/utils";

const hm = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function StatusBar() {
  const now = useNow(true, 15000);
  return (
    <div className="statusbar relative z-50 h-[50px] shrink-0 items-center justify-between px-8 pt-1 text-[15px] font-semibold">
      <span className="tnum" data-testid="text-status-time">{hm(now).replace(/\s?[AP]M/, "")}</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <Signal className="h-4 w-4" strokeWidth={2.5} /><Wifi className="h-4 w-4" strokeWidth={2.5} /><BatteryFull className="h-5 w-5" strokeWidth={2} />
      </span>
    </div>
  );
}

function CallBar({ s, c }: { s: IrisState; c: IrisController }) {
  const now = useNow(!!s.call);
  if (!s.call) return null;
  const hold = s.holdUntil ? ` · holding ${clock(s.holdUntil - now)}` : "";
  return (
    <div className="flex shrink-0 items-center gap-2 bg-[hsl(var(--live))] px-4 py-2 text-[13px] font-medium text-white" role="status" data-testid="bar-call">
      <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-white" />
      <span className="min-w-0 flex-1 truncate">Iris is on a call with {s.carrierName} · <span className="tnum">{clock(now - s.call.startedAt)}</span>{hold}</span>
      {s.stage === "call" && (
        <button onClick={() => c.skip()} className="shrink-0 font-semibold underline underline-offset-2" data-testid="link-skip">Skip ahead</button>
      )}
    </div>
  );
}

function Bubble({ m, s, c, tail }: { m: Msg; s: IrisState; c: IrisController; tail: boolean }) {
  if (m.kind === "bill")
    return <BillCard facts={m.facts} guess={m.guess} draft={s.editingId === m.id ? s.draft : null} errors={s.errors}
      onFact={(p) => c.editDraft(p)} onLine={(i, p) => c.editLine(i, p)} onSave={() => c.save()} />;
  if (m.kind === "result") return <ResultCard r={m.result} />;
  if (m.kind === "copy") return <CopyCard text={m.text} />;
  if (m.kind === "image")
    return <img src={billSvg(m.profile)} alt={billAlt(m.profile)} className="w-[62%] max-w-[210px] rounded-[18px] border border-border" data-testid="img-user-bill" />;
  const user = m.from === "user";
  return (
    <p className={cn("max-w-[76%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15.5px] leading-[1.32]",
      user ? "bubble-user rounded-[20px]" : "bubble-iris rounded-[20px]",
      tail && (user ? "rounded-br-[6px]" : "rounded-bl-[6px]"))} data-testid={`text-msg-${m.id}`}>
      {m.text}
    </p>
  );
}

function Messages({ s, c }: { s: IrisState; c: IrisController }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [s.messages.length, s.typing, s.editingId, s.errors.length, s.chips.length]);
  const lastUser = [...s.messages].reverse().find((m) => m.from === "user")?.id;
  const first = s.messages[0];
  return (
    <div ref={ref} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-3" role="log" aria-live="polite" aria-label="Conversation with Iris" data-testid="list-messages">
      {first && <p className="mb-3 text-center text-[11.5px] font-medium text-muted-foreground"><span className="font-semibold">Today</span> {hm(first.at)}</p>}
      {s.messages.map((m, i) => {
        const next = s.messages[i + 1];
        const prev = s.messages[i - 1];
        const user = m.from === "user";
        const endGroup = !next || next.from !== m.from;
        const gap = prev && m.at - prev.at > 5 * 60000;
        return (
          <div key={m.id}>
            {gap && <p className="my-3 text-center text-[11.5px] text-muted-foreground">{hm(m.at)}</p>}
            <div className={cn("rise flex", user ? "justify-end" : "justify-start", endGroup ? "mb-2.5" : "mb-[3px]")}>
              <Bubble m={m} s={s} c={c} tail={endGroup} />
            </div>
            {m.id === lastUser ? (
              <p className="-mt-1.5 mb-2.5 pr-1 text-right text-[11px] font-medium text-muted-foreground" data-testid="text-delivered">Delivered · {hm(m.at)}</p>
            ) : endGroup && (
              <p className={cn("-mt-1.5 mb-2.5 px-1 text-[10.5px] text-muted-foreground/80", user ? "text-right" : "text-left")}>{hm(m.at)}</p>
            )}
          </div>
        );
      })}
      {s.typing && (
        <div className="rise mb-2 flex" aria-label="Iris is typing" data-testid="status-typing">
          <span className="bubble-iris flex gap-1 rounded-[20px] rounded-bl-[6px] px-4 py-3.5">
            {[0, 1, 2].map((d) => <span key={d} className="dot h-2 w-2 rounded-full bg-[hsl(225_8%_52%)]" style={{ animationDelay: `${d * 0.16}s` }} />)}
          </span>
        </div>
      )}
    </div>
  );
}

function Composer({ s, c }: { s: IrisState; c: IrisController }) {
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    c.send(text);
    setText("");
  };
  return (
    <div className="shrink-0 border-t border-border/70 bg-[hsl(var(--screen))] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      {s.chips.length > 0 && (
        <div className="mb-2 flex flex-wrap justify-end gap-1.5" data-testid="list-chips">
          {s.chips.map((ch) => (
            <button key={ch.id} onClick={() => c.chip(ch)} data-testid={`chip-${ch.id}`}
              className="rise rounded-full border border-primary/50 bg-[hsl(var(--screen))] px-3.5 py-1.5 text-[14px] font-medium text-primary transition-colors hover:bg-primary/5 active:scale-[.97]">
              {ch.label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="composer" className="sr-only">Message Iris</label>
        <input id="composer" value={text} onChange={(e) => setText(e.target.value)} placeholder="Text Iris" autoComplete="off" enterKeyHint="send"
          className="min-w-0 flex-1 rounded-full border border-input bg-[hsl(var(--screen))] px-4 py-2 text-[16px] outline-none placeholder:text-muted-foreground/80 focus:border-primary/60" data-testid="input-message" />
        <button type="submit" disabled={!text.trim()} aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--bubble-user))] text-white transition-all disabled:bg-muted disabled:text-muted-foreground active:scale-90" data-testid="button-send">
          <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}

function App() {
  const [s, c] = useIris();
  const overlay = s.stage === "ring" || s.stage === "incall";
  return (
    <div className="page-bg flex h-[100dvh] flex-col items-center overflow-hidden sm:justify-center sm:gap-4 sm:py-4">
      <div role="note" className="relative z-10 flex w-full shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-[hsl(var(--background)/.9)] px-3 pb-1.5 pt-[max(6px,env(safe-area-inset-top))] text-[11.5px] leading-tight text-muted-foreground sm:w-auto sm:rounded-full sm:border sm:px-4 sm:py-1.5 sm:text-[12.5px]" data-testid="text-disclosure">
        <span>Prototype: Iris's replies and the call are simulated. No carrier is contacted.</span>
        <button onClick={() => c.start()} className="flex shrink-0 items-center gap-1 font-semibold text-foreground" data-testid="button-restart">
          <RotateCcw className="h-3.5 w-3.5" /> Restart demo
        </button>
      </div>
      <div className="phone">
        <div className="notch" aria-hidden />
        <div className="screen">
          <StatusBar />
          <header className="flex shrink-0 flex-col items-center gap-1 border-b border-border/70 bg-[hsl(var(--screen)/.92)] pb-2 pt-2 backdrop-blur">
            <Avatar size={42} />
            <div className="text-center leading-tight">
              <h1 className="text-[14px] font-semibold" data-testid="text-agent-name">Iris</h1>
              <p className="text-[11.5px] text-muted-foreground">AI agent</p>
            </div>
          </header>
          <CallBar s={s} c={c} />
          <Messages s={s} c={c} />
          <Composer s={s} c={c} />
          {s.sheet === "samples" && <SampleSheet onPick={(id) => c.pickSample(id)} onClose={() => c.closeSheet()} />}
          {s.sheet === "transcript" && <TranscriptSheet lines={s.transcript} live={!!s.call} onClose={() => c.closeSheet()} />}
          {overlay && (
            <CallOverlay mode={s.stage as "ring" | "incall"} caption={s.caption}
              onAccept={() => c.accept()} onDecline={() => c.hold()} onApprove={() => c.approve()} onNotYet={() => c.hold()} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
