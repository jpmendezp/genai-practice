import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { IrisController } from "@/lib/chat-engine";

export function useIris() {
  const ref = useRef<IrisController | null>(null);
  if (!ref.current) ref.current = new IrisController();
  const c = ref.current;
  const state = useSyncExternalStore(c.subscribe, c.get);
  useEffect(() => {
    c.start();
    return () => c.dispose();
  }, [c]);
  return [state, c] as const;
}

/** Re-render on an interval while active; returns the current time. */
export function useNow(active: boolean, ms = 1000) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return Date.now();
}

export const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
