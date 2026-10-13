import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible modal: focuses first [data-autofocus] (or first button), traps Tab, Escape calls onEscape. */
export function Modal({ labelledBy, describedBy, onEscape, className, children, full }: { labelledBy: string; describedBy?: string; onEscape?: () => void; className?: string; children: ReactNode; full?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>("button");
    el?.focus();
    return () => prev?.focus?.();
  }, []);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && onEscape) { e.stopPropagation(); onEscape(); }
    if (e.key !== "Tab" || !ref.current) return;
    const f = Array.from(ref.current.querySelectorAll<HTMLElement>("button:not([disabled]),[href],input,[tabindex]:not([tabindex='-1'])"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className={cn("fixed inset-0 z-40 overflow-y-auto", full ? "" : "grid place-items-center bg-[hsl(232_30%_16%/.45)] p-4 pt-16")}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} onKeyDown={onKey} className={className}>
        {children}
      </div>
    </div>
  );
}
