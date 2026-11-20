import { Router, type IRouter } from "express";
import { UnderstandIntentBody } from "@workspace/api-zod";
import { extractIntent } from "../lib/intent-understanding";

const router: IRouter = Router();
let active = 0;
let windowStart = Date.now();
let requests = 0;

router.post("/openai/intent", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = UnderstandIntentBody.strict().safeParse(req.body);
  if (!parsed.success || !parsed.data.message.trim()) {
    res.status(400).json({ error: "Provide a message of 1–2000 characters." });
    return;
  }
  // In-memory aggregate counters only: never retain user messages or identities.
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); requests = 0; }
  if (active >= 4 || requests >= 60) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Please use keyword matching for now." });
    return;
  }
  requests++;
  active++;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 5500);
  const onClose = () => { if (!res.writableEnded) abort.abort(); };
  res.on("close", onClose);
  try {
    const result = await extractIntent(parsed.data.message.trim(), abort.signal);
    if (!res.destroyed) res.json(result);
  } catch {
    // Do not log messages, provider errors, prompts, response bodies, or secrets.
    req.log.warn({ timedOut: abort.signal.aborted }, "Intent extraction unavailable");
    if (!res.destroyed) res.status(503).json({ error: "AI unavailable; use keyword matching." });
  } finally {
    clearTimeout(timeout);
    res.off("close", onClose);
    active--;
  }
});

export default router;
