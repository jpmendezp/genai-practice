# Iris

Iris is an AI agent you text to cancel or switch your phone plan: it calls your carrier for you, gets past the bots and retention offers, and only calls you when it's time to approve.

## What the first working slice does

The prototype is a simulated phone showing a text conversation with Iris. One flow, start to finish:

1. **Ask:** the user texts Iris what they need (cancel or switch carriers), by tapping a quick reply or typing freely.
2. **Bill:** the user picks their carrier and "attaches" one of three sample bills. Iris replies with a summary card showing the cost to leave, and the user confirms or edits it.
3. **Instructions:** the user tells Iris how to handle retention offers and authorizes the call.
4. **The call:** Iris sends live updates while she calls the carrier (bot, hold, human agent, offers declined). A full transcript is available. If an offer passes the user's limit, Iris texts to ask.
5. **Approval:** Iris "calls" the user. The user picks up and approves the cancellation.
6. **Done:** Iris sends a confirmation card with confirmation number, final bill date, cost to leave, and number transfer PIN if switching.

## How to open it

Prototype: https://MyIris.replit.app

Open the link and start texting Iris, or tap the quick replies. Use **Skip ahead** during the call to go faster and **Restart demo** to start over. No login needed.

## AI status

| Part | Status |
| --- | --- |
| Understanding what the user wants from their message | **Simulated.** Simple keyword matching stands in for an AI model. |
| Reading the bill and extracting plan facts | **Simulated.** Prewritten results for three sample bills. |
| Making the call (phone menu, carrier bot, human agent, retention offers) | **Simulated.** Prewritten transcript and updates. No real call is placed. |
| Asking the user mid call and calling the user to approve | **Simulated.** Shown on screen as a text and a fake incoming call. |
| Cost to leave from confirmed facts | **Working.** Basic arithmetic, recalculates when the user edits a value. |
| Input checks (empty message, unrelated message, consent before calling) | **Working.** Simple rules, no AI. |

The future AI system will understand free text requests, read any carrier bill, use a voice agent to call the carrier, handle menus, bots and retention offers within the user's rules, and bring the user in only for the final approval. Acting on the user's behalf was a non-goal in Project Problem Framing; it is simulated here to test the long-term vision early, before building it.

## Test results

| Test | Input or action | What happened | Pass, partial, or fail |
| --- | --- | --- | --- |
| Typical case | Ran the full flow with each carrier (T-Mobile, Verizon, AT&T), both to cancel and to switch keeping the number, choosing different options at each step | Iris understood the request, showed the right bill summary and cost to leave, made the simulated call, called to ask for approval, and sent the confirmation card (with transfer PIN when switching). | Pass |
| Challenge case | Verizon family plan: answered "Not sure" about the promo credit, edited a value with "Something's off", chose "Ask me if it's over $20/mo off", then got the $25/mo offer mid call | The flow handled every branch: the cost recalculated after the edit, Iris paused the call to ask about the offer, and the call continued based on the answer. However, the quick reply chips, summary cards and editable fields would not work like this inside iMessage or WhatsApp today, so the experience is not yet realistic for a messaging app. | Partial |
| Invalid or empty case | Tried to send an empty message, typed something unrelated, then declined the approval call | Send was disabled with an empty message, Iris redirected the unrelated message back to the options for that step, and declining the call led to "I'll keep them on hold" with a button to be called again. No dead ends. | Pass |

## Known limitations

1. **The call is entirely simulated.** No voice agent exists yet and every update is prewritten. Next step: test a voice agent against a mock carrier line before any real call.
2. **Iris doesn't really understand messages or bills.** Keyword matching misses anything phrased unexpectedly, and only the three sample bills give accurate numbers. Next step: connect an AI model to interpret messages and extract facts from real bills.
3. **Built for a demo screen, not a real messaging app.** Quick reply chips, summary cards and editable fields don’t work like this in iMessage or SMS today (WhatsApp supports some buttons). Next step: redesign the flow around plain text with numbered replies, photos, and a link for anything complex.

## Privacy

No API keys, passwords, or tokens are stored in this repository. Nothing the user types is saved or sent anywhere.
