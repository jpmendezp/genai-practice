import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "soft";
export function Btn({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-transform duration-150 active:scale-[.97] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        variant === "primary" && "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_hsl(var(--primary)/.7)] hover:bg-primary/92",
        variant === "soft" && "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        variant === "ghost" && "border border-input bg-card text-foreground hover:bg-muted",
        className,
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[var(--radius)] border border-card-border bg-card p-5 sm:p-6", className)}>{children}</section>;
}

export function LooksRight({ id, checked, onChange, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-within:ring-[3px] focus-within:ring-ring/40",
        checked ? "border-[hsl(168_35%_38%)] bg-[hsl(168_40%_92%)] text-[hsl(168_45%_22%)]" : "border-input bg-card text-muted-foreground hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input id={id} data-testid={`check-${id}`} type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn("grid h-5 w-5 place-items-center rounded-full border-2 transition-all", checked ? "scale-110 border-[hsl(168_35%_38%)] bg-[hsl(168_35%_38%)] text-white" : "border-input")}>
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      Looks right
    </label>
  );
}

export const inputCls =
  "w-full min-h-12 rounded-xl border border-input bg-background px-3.5 text-base text-foreground outline-none transition-shadow focus:border-primary focus:ring-[3px] focus:ring-ring/25 aria-[invalid=true]:border-destructive";
