import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import type { Facts, LineFacts } from "@/lib/iris-data";
import { num, totals, usd } from "@/lib/iris-logic";
import type { Result } from "@/lib/chat-engine";

const Row = ({ k, v, testId }: { k: string; v: string; testId?: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <dt className="text-[13px] text-muted-foreground">{k}</dt>
    <dd className="tnum text-right text-[13.5px] font-medium" data-testid={testId}>{v}</dd>
  </div>
);

function Field({ label, value, onChange, testId, mode = "decimal", wide }: { label: string; value: string; onChange: (v: string) => void; testId: string; mode?: "decimal" | "numeric" | "text"; wide?: boolean }) {
  return (
    <label className={wide ? "col-span-2 block" : "block"}>
      <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        value={value} inputMode={mode} onChange={(e) => onChange(e.target.value)} data-testid={testId}
        className="tnum w-full rounded-lg border border-input bg-[hsl(var(--screen))] px-2.5 py-1.5 text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}

export function BillCard({ facts, guess, draft, errors, onFact, onLine, onSave }: {
  facts: Facts; guess: boolean; draft: Facts | null; errors: string[];
  onFact: (p: Partial<Facts>) => void; onLine: (i: number, p: Partial<LineFacts>) => void; onSave: () => void;
}) {
  const f = draft ?? facts;
  const t = totals(f);
  const editing = !!draft;
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) wrap.current?.querySelector("input")?.focus({ preventScroll: false });
  }, [editing]);
  const multi = f.perLine.length > 1;
  return (
    <div ref={wrap} className="w-[86%] max-w-[300px] overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_1px_0_hsl(225_14%_88%)]" data-testid="card-bill">
      <div className="flex items-center justify-between bg-[hsl(var(--bubble-iris))] px-4 py-2.5">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{guess ? "Best guess" : "From your bill"}</span>
        {editing && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Editing</span>}
      </div>
      {!editing ? (
        <dl className="divide-y divide-border px-4 py-1.5">
          <Row k="Plan" v={`${f.carrier} · ${f.plan}`} testId="text-plan" />
          <Row k="Monthly" v={`${usd(num(f.monthly))}/mo`} testId="text-monthly" />
          <Row k="Lines" v={String(num(f.lines))} />
          {f.perLine.map((l, i) => (
            <Row key={i} k={multi ? `Line ${i + 1} phone` : "Phone"} testId={`text-device-${i}`}
              v={num(l.deviceCount) > 0 ? `${num(l.deviceCount)} × ${usd(num(l.deviceAmount))}` : "Paid off"} />
          ))}
          <Row k="Credits you lose" v={usd(t.giveUp)} testId="text-credits" />
          <Row k="Early termination fee" v={usd(t.etf)} />
          <div className="flex items-baseline justify-between py-2.5">
            <span className="text-[14px] font-bold">Cost to leave</span>
            <span className="tnum text-[18px] font-bold" data-testid="text-cost">{usd(t.exit)}</span>
          </div>
        </dl>
      ) : (
        <form className="space-y-3 px-4 py-3" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Carrier" mode="text" value={f.carrier} onChange={(v) => onFact({ carrier: v })} testId="input-carrier" />
            <Field label="Plan" mode="text" value={f.plan} onChange={(v) => onFact({ plan: v })} testId="input-plan" />
            <Field label="Monthly $" value={f.monthly} onChange={(v) => onFact({ monthly: v })} testId="input-monthly" />
            <Field label="Lines" mode="numeric" value={f.lines} onChange={(v) => onFact({ lines: v })} testId="input-lines" />
          </div>
          {f.perLine.map((l, i) => (
            <fieldset key={i} className="rounded-xl bg-muted/60 p-2.5">
              <legend className="sr-only">Line {i + 1}</legend>
              <p className="mb-1.5 text-[12px] font-semibold">{multi ? `Line ${i + 1}` : "Your line"}</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Payments left" mode="numeric" value={l.deviceCount} onChange={(v) => onLine(i, { deviceCount: v })} testId={`input-device-count-${i}`} />
                <Field label="Per payment $" value={l.deviceAmount} onChange={(v) => onLine(i, { deviceAmount: v })} testId={`input-device-amount-${i}`} />
                <Field label="Credit $/mo" value={l.promoAmount} onChange={(v) => onLine(i, { promoAmount: v })} testId={`input-promo-amount-${i}`} />
                <Field label="Credit months" mode="numeric" value={l.promoMonths} onChange={(v) => onLine(i, { promoMonths: v })} testId={`input-promo-months-${i}`} />
              </div>
            </fieldset>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Early term. fee $" value={f.etf} onChange={(v) => onFact({ etf: v })} testId="input-etf" />
          </div>
          {errors.length > 0 && (
            <ul role="alert" className="space-y-0.5 rounded-lg bg-destructive/10 px-2.5 py-2 text-[12.5px] text-destructive">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2.5" aria-live="polite">
            <span className="text-[14px] font-bold">Cost to leave</span>
            <span className="tnum text-[18px] font-bold" data-testid="text-cost-live">{usd(t.exit)}</span>
          </div>
          <button type="submit" className="w-full rounded-full bg-primary py-2.5 text-[14px] font-semibold text-primary-foreground transition-transform active:scale-[.98]" data-testid="button-save-facts">
            Save
          </button>
        </form>
      )}
    </div>
  );
}

export function ResultCard({ r }: { r: Result }) {
  const kept = r.outcome === "kept";
  return (
    <div className="w-[86%] max-w-[300px] overflow-hidden rounded-[20px] border border-border bg-card" data-testid="card-result">
      <div className="flex items-center gap-2 bg-[hsl(var(--accent))] px-4 py-3 text-[hsl(var(--accent-foreground))]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--live))] text-white"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
        <span className="text-[14px] font-semibold">{kept ? "You're staying, for less" : r.outcome === "pin" ? "Ready to switch" : "Cancellation done"}</span>
      </div>
      <dl className="divide-y divide-border px-4 py-1.5">
        {kept ? (
          <>
            <Row k="New price" v={`${usd(r.newPrice!)}/mo`} testId="text-new-price" />
            <Row k="Deal" v={`${usd(r.offer!.monthly).replace(".00", "")}/mo off`} />
            <Row k="For" v={`${r.offer!.months} months`} />
            <Row k="Service" v="Stays active" />
            <Row k="Reference" v={r.conf} testId="text-confirmation" />
          </>
        ) : (
          <>
            <Row k="Done" v={r.target} />
            <Row k="Confirmation" v={r.conf} testId="text-confirmation" />
            {r.pin && <Row k="Transfer PIN" v={r.pin} testId="text-pin" />}
            <Row k="Final bill" v={r.finalBill!} />
            <Row k="Cost to leave" v={usd(r.exit)} testId="text-result-cost" />
            <Row k="Credits you lose" v={usd(r.giveUp)} />
          </>
        )}
        <Row k="Offers declined" v={String(r.declined)} />
      </dl>
      <p className="border-t border-border bg-muted/50 px-4 py-2.5 text-[13px] font-medium">You skipped about 47 min on hold.</p>
      <p className="px-4 pb-2.5 text-[11px] text-muted-foreground">{kept ? "No cancellation, no PIN, no final bill." : "Dates and numbers are fictional."}</p>
    </div>
  );
}

export function CopyCard({ text }: { text: string }) {
  return (
    <textarea
      readOnly value={text} rows={9} onFocus={(e) => e.currentTarget.select()} aria-label="Call summary to copy" data-testid="textarea-copy"
      className="w-[86%] max-w-[300px] resize-none rounded-2xl border border-border bg-card p-3 font-mono text-[11.5px] leading-snug outline-none focus:ring-2 focus:ring-primary/30"
    />
  );
}
