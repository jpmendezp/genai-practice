# Iris

Iris is an AI agent you text to cancel or switch your phone plan: it calls your carrier for you, gets past the bots and retention offers, and only calls you when it's time to approve.

**Intended user:** US adults who want to leave or switch their phone carrier but dread the retention call and don't know what leaving will really cost.

## Prototype

**Live app:** https://MyIris.replit.app

Open the link and text Iris what you need (for example, *"I'm moving to Mint Mobile and want to keep my number, can you get me off AT&T?"*), or tap a quick reply. Use **Skip ahead** during the call and **Restart demo** to start over. No login needed. All bills, names and numbers are fictional.

## Demo Video

Draft demo (Google Drive): **[ADD GOOGLE DRIVE LINK]**

Viewing access granted to Emelia Hughes and Samuel Huang. The same file is uploaded to Canvas.

## Assignment documents

| Component | Where |
| --- | --- |
| Revision documentation: priority improvements, peer feedback response, 5 test cases, before and after, interpretation, risk response, limitations, next priorities | [revision.md](revision.md) |
| Draft AI-use disclosure | [ai-use-disclosure.md](ai-use-disclosure.md) |
| Before and after screenshots | [docs/screenshots/](docs/screenshots/) |
| Prototype code | [artifacts/iris/](artifacts/iris/) (front end), [artifacts/api-server/](artifacts/api-server/) (server and live AI endpoint) |

## What the prototype does

The prototype is a simulated phone showing a text conversation with Iris. One flow, start to finish:

1. **Ask:** the user texts Iris what they need. A live AI model reads the message.
2. **Confirm:** Iris restates it ("Switching from AT&T to Mint Mobile and keeping your number, right?") and waits for the user to confirm or correct it. If something is missing, she asks for it.
3. **Bill:** the user "attaches" one of three sample bills. If the bill's carrier doesn't match, Iris asks which account to call about. Iris shows the cost to leave, which the user can confirm or edit.
4. **Options:** Iris offers 2 or 3 choices (leave now, ask for a better deal first, or wait until credits end), each with a short reason.
5. **The call:** Iris sends live updates while she "calls" the carrier, and texts the user if an offer passes their limit.
6. **Approval and done:** Iris "calls" the user to approve, then sends a confirmation card.

## AI status

| Part | Status |
| --- | --- |
| Understanding the user's first message (goal, carrier leaving, carrier joining, keep number) | **Live AI.** OpenAI gpt-5.4-mini through Replit AI Integrations. Falls back to keyword matching if the model fails; each restatement is labeled "Understood by AI" or "Keyword match". |
| Confirm step and carrier mismatch check | **Working.** Rules, no AI. |
| Reading the bill and extracting plan facts | **Simulated.** Prewritten results for three sample bills. |
| Options after the result (leave now, better deal, wait) | **Working** logic on the sample numbers. The "remind you later" reminder is **simulated**. |
| Making the call (bot, hold, agent, retention offers) and calling the user to approve | **Simulated.** Prewritten. No real call is placed. |
| Cost to leave | **Working.** Arithmetic, recalculates when the user edits a value. |
| Calling real carriers with a voice agent | **Planned.** |

## Privacy

No API keys, passwords or tokens are stored in this repository (the AI integration is configured in Replit's environment). Messages sent to the AI endpoint are not saved. Use only sample information when testing.
