# Prototype Revision

**Product:** Iris, an AI agent you text to cancel or switch your phone plan. It calls your carrier for you and only brings you in to approve.
**Intended user:** US adults who want to leave or switch their phone carrier but dread the retention call and don't know what leaving really costs.
**Prototype:** https://MyIris.replit.app

## 1. Priority improvements

| # | Improvement | Why |
| --- | --- | --- |
| 1 | **Live AI reads the first message.** A real language model (OpenAI gpt-5.4-mini through Replit AI Integrations) extracts the goal, the carrier being left, the carrier being joined and whether to keep the number. Keyword matching is the fallback. | Peer testing showed keyword matching read "Mint Mobile" as T-Mobile. Free text with two carrier names is exactly where fixed rules break. |
| 2 | **Iris restates the request and asks to confirm before moving on** ("Switching from AT&T to Mint Mobile and keeping your number, right?"), with a way to correct it. If the carrier or goal is missing, she asks only for that. | Top peer recommendation. An agent that will place calls must get "who and what" right first. |
| 3 | **Carrier mismatch check.** If the bill's carrier differs from the confirmed carrier, Iris stops and asks which account to call about. She can't offer to call until they match. | Peer saw Iris switch carriers silently when the bill disagreed. This is also the risk response (section 4). |
| 4 | **Alternatives at the result.** After the cost-to-leave card, Iris offers "Leave now" (with the cost), "Ask for a better deal first", and "Wait until [month]" when credits or device payments end within 6 months. | Adapted from a peer who wanted a few explained options where users get their result. |

## 2. Response to peer feedback

Three peer reviews were received (names removed). A fourth comment described a memo, an invoice and laptop costs, which are not part of Iris, so it appears to belong to another project.

| Feedback or observed issue | Decision | What changed, or why it was deferred |
| --- | --- | --- |
| Iris read "Mint Mobile" as T-Mobile, then silently switched to AT&T when the AT&T bill was attached. Recommended: restate the request ("Switching from AT&T to Mint, keeping your number, right?") and ask when the bill's carrier doesn't match. Test with two carriers. | **Acted on** | Live AI parsing of the first message, a confirm step, and a carrier mismatch check (improvements 1 to 3). Tested with the same message and with "leaving Verizon for T-Mobile". |
| User control at key moments works well (asks before calling, approval call summarizes the outcome). Bill summary card is the most useful AI result. | **Kept** | No change. The new confirm and mismatch steps extend the same principle earlier in the flow. |
| Add a few relevant, clearly explained suggestions where users receive their results. | **Adapted** | Added 2 or 3 options after the cost-to-leave card, each with a one-line reason from the bill numbers. Kept it to 3 so the flow stays short. |
| Wanted to know which AI parts are simulated and how closely responses match the input. | **Acted on** | Banner now says which part is live AI. Each restatement shows "Understood by AI" or "Keyword match (AI unavailable)". |
| "So good, cool demo." | **No action** | Positive, no specific change requested. |
| Retry with missing laptop costs returned to the original examples (memo, invoice). | **Not applicable** | Describes a different product. Not acted on. |

## 3. Evaluation

All tests ran on the published app (https://MyIris.replit.app) on November 20, 2026, using fictional sample bills. "Live" means the real model produced the result; "simulated" means prewritten.

| Case | Input or action | Expected result / success criterion | Actual result | Pass, partial, or fail | Implication or next step |
| --- | --- | --- | --- | --- | --- |
| **Typical 1** (live AI + simulated call) | "I'm moving to Mint Mobile and want to keep my number, can you get me off AT&T?" Confirmed, attached AT&T bill, Leave now, Decline everything, approved | Iris restates "AT&T to Mint Mobile, keeping your number" before anything else, then completes the switch with a transfer PIN | Restated correctly ("Understood by AI"). AT&T bill matched. Only "Leave now" and "Ask for a better deal" shown (cost to leave $0). Approval call and result card say "Ready to switch to Mint Mobile" with PIN. | **Pass** | Restatement splits into awkward bubbles ("number," alone). Fix bubble splitting. |
| **Typical 2** | "hey, I want to cancel my Verizon plan", attached Verizon family bill, "Just line 2", "Ask for a better deal first" | Restates "Canceling your Verizon plan", shows $699.80 cost to leave, offers options with reasons, and choosing "better deal" skips the retention question | All as expected. Retention rule set to "ask me if it's over $20/mo off" automatically, then Iris asked to call. | **Pass** | "Wait until..." never appears with the 3 sample bills (no credits or payments end within 6 months), so that branch is untested. Add a sample that triggers it. |
| **Challenge** (two carriers, slang spelling) | "leaving verizon for tmobile, they have a better deal for my family" | Identifies Verizon as the carrier being left and T-Mobile as the new one, without inventing "keep number" | "Switching from Verizon to T-Mobile for a better family deal, right?" | **Pass** | When typed before the greeting finished, "What do you need?" appeared after the user's message. Block sending until the greeting ends. |
| **Invalid or empty** | Tried to send only spaces; then "what's the weather tomorrow?"; then "my phone bill is way too high, thinking about leaving" | Blank message can't be sent; unrelated message is redirected, not answered; missing carrier is asked for, not guessed | Send stayed disabled. Weather message got "Do you want to cancel your plan, or switch carriers and keep your number?" Vague message got "Who's your carrier right now?" with carrier chips. | **Pass** | Iris could say once that she only handles phone plans, so the redirect feels less abrupt. |
| **Risk** (wrong account) | Confirmed "leaving AT&T", then attached the **T-Mobile** sample bill | Iris does not switch silently; she flags the mismatch, asks which account, and does not offer to call until resolved | "Heads up: this bill is from T-Mobile, but you said you're leaving AT&T. Which account should I call about?" Chips: "T-Mobile" / "AT&T, I'll send another bill". Choosing AT&T reopened the bill sheet; the call option only appeared after a matching bill. | **Pass** | Safeguard depends on the bill being read correctly, which is still simulated. |

### Repeat test (live model)

The challenge input was sent 3 times in fresh sessions. All 3 returned the same restatement: "Switching from Verizon to T-Mobile for a better family deal, right?" No variation that matters. Three runs of one input is not evidence of accuracy across other messages.

**Caveat on independence:** the model's instructions include worked examples close to two of these tests ("leaving Verizon for T-Mobile", "get me off AT&T and onto Mint Mobile"). Passing them shows the prompt works for those patterns, not that it generalizes. The server also rejects any carrier the model returns that does not literally appear in the user's message, which blocks invented carriers but was not directly tested.

### Before and after (same input)

Input: *"I'm moving to Mint Mobile and want to keep my number, can you get me off AT&T?"* then attach a bill.

| | Before (First Working Slice) | After (this revision) |
| --- | --- | --- |
| First reply | "Got it, T-Mobile." (wrong carrier) | "Switching from AT&T to Mint Mobile and keeping your number, right?" with Yes / Change something |
| Bill from another carrier | Switched to the bill's carrier without saying anything | Flags the mismatch and asks which account to call about |
| Screenshot | `docs/screenshots/before-wrong-carrier.jpg` | `docs/screenshots/after-confirm-request.jpg`, `docs/screenshots/after-carrier-mismatch.jpg` |

The revision helped: the exact failure the peer found no longer happens, and the user now sees and approves who Iris will call before any step that depends on it.

### What the evidence tells us

The central task now works from first message to approval, and the riskiest early mistake (calling about the wrong account) is caught twice: once when Iris restates the request and again when the bill disagrees. The live model handled the two-carrier messages it was given and was consistent across three repeats, which supports the claim that users can write naturally instead of tapping menus. What remains unreliable or untested: only a handful of messages went through the model (no typos, Spanish, sarcasm or very long messages); bill reading, retention offers and the call are still simulated, so the cost numbers and the call outcome prove nothing about real carriers; the "Wait until" alternative never triggered with the sample bills; and chips and cards still would not work inside iMessage or SMS. Next I would test 20 to 30 varied first messages against expected answers, add a sample bill that triggers "Wait until", and test the flow as plain numbered text replies.

## 4. Risk response: calling about the wrong account

**Who could be affected:** the user, and possibly another person on a different account. **What might go wrong:** Iris acts on a misunderstanding (wrong carrier or wrong goal) and calls the wrong company, cancels the wrong line, or skips a step the user wanted. In the earlier prototype this happened silently, so the user had no chance to notice. **What changed:** Iris now restates the request in plain words and waits for "Yes, that's right" before continuing; asks for missing information instead of guessing; and if the bill's carrier contradicts what the user said, she stops and asks, and won't offer to call until they match. **What risk remains:** a user can tap "Yes" without reading (over-reliance on AI), the bill check relies on simulated bill reading, and the model could still misread an unusual message, although the restatement makes that visible. **Course theme:** user control and over-reliance on AI. The design keeps the person as the decision maker at each step where an error would be costly, instead of trusting the model's interpretation. **Status:** confirm step and mismatch check are **implemented**; the bill they check is **simulated**.

## 5. Remaining limitations (ranked by effect on the central task)

1. **The call and bill reading are simulated.** Every cost and call outcome comes from three prewritten samples.
2. **Live AI is lightly tested.** Six messages in total; accuracy on varied real messages is unknown.
3. **Built for a demo screen, not a real messaging app.** Chips, cards and the bill sheet don't exist in iMessage or SMS.
4. **Small UX issues.** Restatements split into awkward bubbles; typing during the greeting puts "What do you need?" out of order.

## 6. Next priorities

1. Build a test set of 20 to 30 first messages (two carriers, typos, Spanish, vague) with expected answers and measure how often the model is right.
2. Make bill reading live (extract facts from an uploaded image or text) so the mismatch check works on real input.
3. Redesign the flow as plain text with numbered replies to test whether it works inside a real messaging app.
