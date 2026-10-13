export function Avatar({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,hsl(24_95%_68%),hsl(350_70%_56%)_55%,hsl(262_45%_42%))] font-display text-white shadow-[inset_0_-2px_6px_hsl(262_45%_30%/.35)]"
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      I
    </span>
  );
}
