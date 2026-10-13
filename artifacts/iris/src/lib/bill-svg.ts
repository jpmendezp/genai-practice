import { SAMPLES, type Profile } from "./iris-data";

const BAND: Record<Profile, string> = { A: "#c2185b", B: "#cf2a1f", C: "#1f7fc4" };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Local, fictional bill "screenshot" drawn from the sample bill text. No network. */
export function billSvg(id: Profile): string {
  const s = SAMPLES.find((x) => x.id === id)!;
  const lines = s.text.split("\n");
  const [title, ...rest] = lines;
  const rows = rest
    .map((l, i) => {
      const bold = /total/i.test(l);
      const t = l.replace(/\s\.{2,}\s/, "  ").replace(/\.{3,}/g, "");
      return `<text x="18" y="${96 + i * 22}" font-size="11.5" font-weight="${bold ? 700 : 400}" fill="${bold ? "#14161c" : "#3b3f4a"}">${esc(t)}</text>`;
    })
    .join("");
  const h = 120 + rest.length * 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="${h}" viewBox="0 0 320 ${h}" font-family="ui-monospace, Menlo, monospace">
<rect width="320" height="${h}" rx="10" fill="#fbfaf7"/>
<rect width="320" height="44" rx="10" fill="${BAND[id]}"/><rect y="30" width="320" height="14" fill="${BAND[id]}"/>
<text x="18" y="28" font-size="15" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${esc(s.carrier)}</text>
<text x="302" y="28" font-size="10" fill="#fff" text-anchor="end" font-family="system-ui, sans-serif">SAMPLE BILL</text>
<text x="18" y="68" font-size="10.5" fill="#6b6f7a">${esc(title)}</text>
<line x1="18" x2="302" y1="78" y2="78" stroke="#e3e0d8"/>${rows}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const billAlt = (id: Profile) => {
  const s = SAMPLES.find((x) => x.id === id)!;
  return `Sample ${s.label} bill. ${s.text.replace(/\.{2,}/g, " ").replace(/\s+/g, " ")}`;
};
