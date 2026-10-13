import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { SAMPLES, type Profile } from "@/lib/iris-data";
import { billAlt, billSvg } from "@/lib/bill-svg";
import type { Line } from "@/lib/chat-engine";
import { cn } from "@/lib/utils";

function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector<HTMLElement>("button")?.focus(); }, []);
  return (
    <div className="fade-in absolute inset-0 z-40 flex flex-col justify-end bg-[hsl(225_30%_10%/.35)]" onClick={onClose}>
      <div
        ref={ref} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className={cn("sheet-in flex flex-col rounded-t-[28px] bg-[hsl(var(--screen))] pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_hsl(225_30%_10%/.15)]", tall ? "max-h-[82%]" : "max-h-[70%]")}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-muted" data-testid="button-close-sheet"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SampleSheet({ onPick, onClose }: { onPick: (id: Profile) => void; onClose: () => void }) {
  return (
    <Sheet title="Choose a sample bill" onClose={onClose}>
      <p className="px-5 pb-3 text-[13px] text-muted-foreground">Fictional bills for this demo. Nothing leaves your device.</p>
      <div className="grid grid-cols-3 gap-2.5 overflow-y-auto px-5 pb-2">
        {SAMPLES.map((s) => (
          <button key={s.id} onClick={() => onPick(s.id)} className="group text-left" data-testid={`button-sample-${s.id}`}>
            <img src={billSvg(s.id)} alt={billAlt(s.id)} className="aspect-[3/4] w-full rounded-xl border border-border object-cover object-top transition-transform group-active:scale-95" />
            <span className="mt-1.5 block text-[12px] font-semibold leading-tight">{s.carrier}</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">{s.label.replace(`${s.carrier} `, "")}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

const LABEL: Record<string, string> = { "Carrier bot": "text-[hsl(30_70%_38%)]", "Carrier agent": "text-[hsl(3_60%_44%)]", Iris: "text-primary" };

export function TranscriptSheet({ lines, live, onClose }: { lines: Line[]; live: boolean; onClose: () => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [lines.length]);
  return (
    <Sheet title="Live transcript" onClose={onClose} tall>
      <div className="flex items-center gap-2 px-5 pb-2 text-[12px] text-muted-foreground">
        {live ? <><span className="live-dot h-2 w-2 rounded-full bg-[hsl(var(--live))]" /> Live, updates as the call goes</> : "Call transcript"}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3" role="log" aria-live="polite" data-testid="list-transcript">
        {lines.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">Nothing yet. The call hasn't started.</p>}
        {lines.map((l) =>
          l.speaker === "note" ? (
            <p key={l.id} className="text-center text-[12px] italic text-muted-foreground">{l.text}</p>
          ) : (
            <div key={l.id} className="rise">
              <p className={cn("text-[11px] font-bold uppercase tracking-wider", LABEL[l.speaker])}>{l.speaker}</p>
              <p className="text-[14px] leading-snug">{l.text}</p>
            </div>
          ),
        )}
        <div ref={end} />
      </div>
    </Sheet>
  );
}
