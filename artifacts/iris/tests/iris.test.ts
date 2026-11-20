// Run: pnpm --filter @workspace/iris exec tsx --test tests/iris.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIntent, validateIntent, understandWithTimeout, safeModelRestatement, fromModel } from "../src/lib/intent-parser.ts";
import { buildAlternatives } from "../src/lib/alternatives.ts";
import { factsFor } from "../src/lib/iris-data.ts";
import { IrisController } from "../src/lib/chat-engine.ts";

const flush = async (n = 300) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const quietLog = console.info; console.info = () => {};
function make(understand: any = null, intentTimeoutMs = 6000) {
  const c = new IrisController({ understand, intentTimeoutMs, now: () => new Date(2026, 0, 15) });
  c.timing = { ...c.timing, min: 0, max: 0, scale: 0 };
  c.start();
  return c;
}
const irisText = (c: IrisController) => c.get().messages.filter((m) => m.from === "iris" && (m.kind === "text" || m.kind === "note")).map((m: any) => m.text).join(" | ");
const chip = (c: IrisController, id: string) => { const ch = c.get().chips.find((x) => x.id === id); assert.ok(ch, `chip ${id} in ${c.get().chips.map((x) => x.id)}`); c.chip(ch); };
const ai = (o: any) => async () => ({ goal: "switch", fromCarrier: null, toCarrier: null, keepNumber: null, confidence: "high", restatement: "ok", ...o });

test("parser: two-carrier direction", () => {
  assert.deepEqual([parseIntent("I'm leaving Verizon for T-Mobile").fromCarrier, parseIntent("I'm leaving Verizon for T-Mobile").toCarrier, parseIntent("I'm leaving Verizon for T-Mobile").goal], ["Verizon", "T-Mobile", "switch"]);
  const p = parseIntent("get me off AT&T and move to Mint Mobile");
  assert.equal(p.fromCarrier, "AT&T"); assert.equal(p.toCarrier, "Mint Mobile"); assert.equal(p.goal, "switch");
  const m = parseIntent("moving to Boost");
  assert.equal(m.fromCarrier, null); assert.equal(m.toCarrier, "Boost Mobile");
  const f = parseIntent("switch from Verizon to Cricket");
  assert.equal(f.fromCarrier, "Verizon"); assert.equal(f.toCarrier, "Cricket");
  const ambiguous = parseIntent("switch Verizon T-Mobile");
  assert.equal(ambiguous.fromCarrier, null); assert.equal(ambiguous.toCarrier, null);
  assert.equal(ambiguous.confidence, "low");
});
test("parser: MVNOs never collapse to T-Mobile", () => {
  assert.equal(parseIntent("cancel mint mobile").fromCarrier, "Mint Mobile");
  assert.equal(parseIntent("leaving Metro by T-Mobile for Verizon").fromCarrier, "Metro by T-Mobile");
  assert.equal(parseIntent("leaving Metro by T-Mobile for Verizon").toCarrier, "Verizon");
  assert.equal(parseIntent("cancel my tmobile").fromCarrier, "T-Mobile");
  assert.equal(parseIntent("cancel my t mobile").fromCarrier, "T-Mobile");
  assert.equal(parseIntent("cancel my magenta tmo").fromCarrier, null);
  assert.equal(parseIntent("switch from Mint Mobile to Verizon, don't keep my number").keepNumber, false);
});
test("validateIntent enforces exact shape", () => {
  const ok = { goal: "switch", fromCarrier: "Verizon", toCarrier: null, keepNumber: null, confidence: "high", restatement: "x" };
  assert.ok(validateIntent(ok));
  assert.equal(validateIntent({ ...ok, goal: "port" }), null);
  assert.equal(validateIntent({ ...ok, keepNumber: "yes" }), null);
  assert.equal(validateIntent({ ...ok, confidence: "medium" }), null);
  const { toCarrier: _t, ...missing } = ok; assert.equal(validateIntent(missing), null);
  assert.equal(validateIntent({ ...ok, restatement: "" }), null);
  assert.equal(validateIntent(null), null);
});
test("model restatement rejected when it asks extra questions or asserts number", () => {
  const p = fromModel(validateIntent({ goal: "switch", fromCarrier: "Verizon", toCarrier: "T-Mobile", keepNumber: null, confidence: "high", restatement: "Switching from Verizon to T-Mobile, and you want to keep your number?" })!);
  assert.equal(safeModelRestatement(p), null);
  const q = fromModel(validateIntent({ goal: "switch", fromCarrier: "Verizon", toCarrier: "T-Mobile", keepNumber: null, confidence: "high", restatement: "Switching from Verizon to T-Mobile. Right?" })!);
  assert.equal(safeModelRestatement(q), "Switching from Verizon to T-Mobile.");
  assert.equal(safeModelRestatement({ ...q, restatement: "Switching from T-Mobile to Verizon." }), null);
});
test("timeout resolves null even if model ignores abort", async () => {
  const never = () => new Promise(() => {});
  const r = await understandWithTimeout(never, "hi", 20).promise;
  assert.equal(r, null);
});
test("invalid model JSON uses fallback rather than advancing on malformed data", async () => {
  const c = make(async () => ({ goal: "cancel", fromCarrier: "Verizon", confidence: "high" }));
  await flush(); c.send("leaving Verizon for Mint Mobile"); await flush();
  assert.equal(c.get().stage, "restate");
  assert.match(irisText(c), /from Verizon to Mint Mobile/);
  assert.ok(c.get().messages.some((m: any) => m.tag === "keyword"));
  c.dispose();
});

test("alternatives: sample defaults offer no wait", () => {
  for (const p of ["A", "B", "C"] as const) assert.equal(buildAlternatives(factsFor(p), new Date(2026, 0, 15)).horizon, null);
});
test("alternatives: edited short endpoints", () => {
  const f = factsFor("A"); f.perLine[0].deviceCount = "4"; f.perLine[0].promoMonths = "3";
  const a = buildAlternatives(f, new Date(2026, 10, 15));
  assert.equal(a.horizon, 4); assert.equal(a.monthLabel, "March 2027");
  assert.equal(a.deviceAvoided, 4 * 27.08); assert.equal(a.creditsRunOut, 30);
  const g = factsFor("A"); g.perLine[0].promoMonths = "2"; g.perLine[0].deviceCount = "0"; // credits only
  const b = buildAlternatives(g, new Date(2026, 0, 15));
  assert.equal(b.horizon, 2); assert.equal(b.deviceAvoided, 0); assert.equal(b.monthLabel, "March");
  assert.ok(b.reasons.some((r) => /won't lower/.test(r)));
  assert.equal(buildAlternatives(g, new Date(2026, 0, 15), { ignoreCredits: true }).horizon, null);
});

test("AI path: restate, label, destination kept through result", async () => {
  const c = make(ai({ fromCarrier: "AT&T", toCarrier: "Mint", keepNumber: true, restatement: "Switching from AT&T to Mint Mobile, keeping your number." }));
  await flush(); c.send("get me off at&t, moving to mint"); c.send("again"); await flush();
  assert.equal(c.get().stage, "restate");
  assert.ok(c.get().messages.some((m: any) => m.tag === "ai"));
  assert.match(irisText(c), /Mint Mobile/); assert.doesNotMatch(irisText(c), /Got it, AT&T/);
  chip(c, "right"); await flush();
  assert.equal(c.get().stage, "bill");
  c.pickSample("C"); await flush(); chip(c, "yes"); await flush();
  assert.equal(c.get().stage, "alts"); chip(c, "leave-now"); await flush();
  chip(c, "r-decline"); await flush(); chip(c, "go"); await flush(2000);
  assert.equal(c.get().stage, "ring"); assert.match(c.get().caption, /Mint Mobile/);
  c.accept(); c.approve(); await flush();
  const r: any = c.get().messages.find((m) => m.kind === "result");
  assert.equal(r.result.toCarrier, "Mint Mobile"); c.dispose();
});
test("only one model call for rapid sends; keyword fallback on failure", async () => {
  let calls = 0;
  const c = make(async () => { calls++; throw new Error("x"); });
  await flush(); c.send("cancel verizon"); c.send("cancel verizon"); c.send("hi"); await flush();
  assert.equal(calls, 1);
  assert.ok(c.get().messages.some((m: any) => m.tag === "keyword"));
  assert.match(irisText(c), /Canceling your Verizon plan/); c.dispose();
});
test("six-second style timeout via injected parameter falls back", async () => {
  const c = make(() => new Promise(() => {}), 30);
  await flush(); c.send("leaving verizon for t-mobile"); assert.equal(c.get().typing, true);
  await new Promise((r) => setTimeout(r, 60)); await flush();
  assert.equal(c.get().stage, "restate"); assert.match(irisText(c), /from Verizon to T-Mobile/); c.dispose();
});
test("late model answer after restart is dropped", async () => {
  let resolve: (v: unknown) => void = () => {};
  const c = make(() => new Promise((r) => { resolve = r; }));
  await flush(); c.send("cancel verizon"); c.start(); await flush();
  resolve({ goal: "cancel", fromCarrier: "Verizon", toCarrier: null, keepNumber: null, confidence: "high", restatement: "Canceling your Verizon plan." });
  await flush();
  assert.equal(c.get().stage, "intent"); assert.doesNotMatch(irisText(c), /Canceling/); c.dispose();
});
test("chips skip AI, no source label; missing carrier then change choices", async () => {
  let calls = 0;
  const c = make(async () => { calls++; return null; });
  await flush(); chip(c, "switch"); await flush();
  assert.equal(calls, 0); assert.equal(c.get().stage, "carrier");
  chip(c, "c-vz"); await flush();
  assert.equal(c.get().stage, "restate"); assert.ok(!c.get().messages.some((m: any) => m.tag));
  chip(c, "change"); await flush(); chip(c, "cancel-instead"); await flush();
  assert.match(irisText(c), /Canceling your Verizon plan/);
  chip(c, "change"); await flush(); chip(c, "wrong-carrier"); await flush(); chip(c, "c-att"); await flush();
  assert.match(irisText(c), /Canceling your AT&T plan/); c.dispose();
});
test("low confidence: clarify, keep destination", async () => {
  const c = make(ai({ fromCarrier: null, toCarrier: "Boost", confidence: "low" }));
  await flush(); c.send("moving to boost"); await flush();
  assert.equal(c.get().stage, "carrier"); chip(c, "c-tmo"); await flush();
  assert.equal(c.get().stage, "restate");
  assert.match(irisText(c), /Switching from T-Mobile to Boost Mobile/); c.dispose();
});
test("complete low-confidence requests require clarification before restatement", async () => {
  const c = make(ai({ fromCarrier: "Verizon", toCarrier: "Mint Mobile", confidence: "low" }));
  await flush(); c.send("maybe Verizon to Mint"); await flush();
  assert.equal(c.get().stage, "lowconf"); chip(c, "switch"); await flush();
  assert.equal(c.get().stage, "restate");
  assert.match(irisText(c), /from Verizon to Mint Mobile/);
  c.dispose();
});
test("mismatch: choose bill carrier", async () => {
  const c = make();
  await flush(); c.send("cancel t-mobile"); await flush(); chip(c, "right"); await flush();
  c.pickSample("C"); await flush();
  assert.equal(c.get().stage, "mismatch"); assert.equal(c.get().facts.carrier, "T-Mobile");
  assert.match(irisText(c), /this bill is from AT&T/);
  c.send("yes call them"); await flush(); assert.equal(c.get().stage, "mismatch");
  chip(c, "mm-bill"); await flush();
  assert.equal(c.get().facts.carrier, "AT&T"); assert.equal(c.get().stage, "confirm"); c.dispose();
});
test("mismatch: choose stated carrier (Mint never labels AT&T sample)", async () => {
  const c = make();
  await flush(); c.send("cancel mint"); await flush(); chip(c, "right"); await flush();
  c.pickSample("C"); await flush(); chip(c, "mm-stated"); await flush();
  assert.equal(c.get().stage, "bill"); assert.equal(c.get().sheet, "samples");
  c.closeSheet(); c.pickSample("C"); await flush(); assert.equal(c.get().stage, "mismatch"); c.dispose();
});
test("negotiate auto-rule skips rule question; wait path on edited facts", async () => {
  const c = make();
  await flush(); c.send("cancel t-mobile"); await flush(); chip(c, "right"); await flush();
  c.pickSample("A"); await flush(); chip(c, "yes"); await flush();
  assert.deepEqual(c.get().chips.map((x) => x.id), ["leave-now", "better"]);
  chip(c, "better"); await flush();
  assert.equal(c.get().stage, "consent"); assert.ok(c.get().chips.some((x) => x.id === "go"));
  assert.equal((c as any).rule.kind, "ask"); assert.equal((c as any).rule.threshold, 20); c.dispose();

  const d = make();
  await flush(); d.send("cancel t-mobile"); await flush(); chip(d, "right"); await flush();
  d.pickSample("A"); await flush(); chip(d, "off"); await flush();
  d.editLine(0, { deviceCount: "3" }); d.save(); await flush();
  chip(d, "yes"); await flush();
  const w = d.get().chips.find((x) => x.id === "wait"); assert.ok(w); assert.match(w!.label, /April/);
  d.send("let's wait"); await flush();
  assert.equal(d.get().stage, "waiting"); assert.match(irisText(d), /Nothing was canceled.*Reminder is simulated/); d.dispose();
});
test("editing carrier requires explicit confirmation", async () => {
  const c = make();
  await flush(); c.send("cancel t-mobile"); await flush(); chip(c, "right"); await flush();
  c.pickSample("A"); await flush(); chip(c, "off"); await flush();
  c.editDraft({ carrier: "Verizon" }); c.save(); await flush();
  assert.equal(c.get().stage, "editcarrier"); chip(c, "ec-keep"); await flush();
  assert.equal(c.get().facts.carrier, "T-Mobile"); assert.equal(c.get().stage, "confirm"); c.dispose();
  console.info = quietLog;
});
