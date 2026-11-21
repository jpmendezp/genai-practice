# AI-Use Disclosure (draft, Prototype Revision)

## Tools used

| Tool | What I used it for |
| --- | --- |
| Claude (Anthropic, claude.ai) | Turning my decisions into build prompts for Replit, reproducing peer review issues in the browser, drafting README, revision notes and this disclosure, checking the repo for secrets |
| Replit Agent | Writing and changing the prototype code (React front end, Express API server) from my prompts |
| OpenAI model through Replit AI Integrations | Runs inside the product: reads the user's first message and extracts goal and carriers (see last section) |

## Development assistance

- **Code:** Replit Agent wrote all of the code. I did not write code by hand. I decided what the product should do, what it should not do, and which branches matter (for example: Iris never approves anything final without the user).
- **Design:** The iMessage-style flow was my idea (users already text with friends, so Iris should feel like a text thread). Claude turned it into a detailed spec for Replit.
- **Testing:** I ran the flows myself. For this milestone Claude also ran the test cases in the browser with me and recorded what appeared on screen. I decided what counts as pass, partial or fail.
- **Writing:** Claude drafted the README sections and revision notes from my results and decisions. I reviewed and edited them.

## Representative prompts

1. **First Working Slice redesign (to Claude, in Spanish, summarized):** I asked to turn the three-step wizard into a simulated text conversation where Iris calls the carrier and the user only picks up to approve. *Produced:* a long spec that Claude sent to Replit Agent (chat bubbles, quick replies, simulated call, approval call). *What I changed:* I tested every carrier and both goals, then pointed out that chips and cards would not work inside a real iMessage or SMS thread, so that became a documented limitation instead of a claimed feature.
2. **Revision (to Claude):** I pasted my peer review comments and asked how hard it would be to use a real AI instead of keyword matching. *Produced:* an option to use a live model only for the first message, with keyword matching as a fallback, plus three priority fixes. *What I changed:* I approved the scope and kept bill reading and the call simulated to stay within the time available.
3. **Revision build prompt (Claude to Replit Agent, excerpt):** "Use a small, cheap model with temperature 0 and a strict system prompt: only extract what the user said, never guess a carrier that was not named, and treat 'Mint Mobile' ... as their own carriers." *Produced:* the `/api/openai/intent` endpoint and the confirm and mismatch steps. *What changed:* Replit reported that the model it chose (gpt-5.4-mini) does not support temperature 0, so it relies on structured JSON output instead. That is why I ran the 3-repeat consistency test.

## Human judgment

- **Rejected:** In Problem Framing, the first draft targeted international students. I rejected it because I wanted an ordinary US situation, and refocused on US adults switching phone carriers (based on my roommate's three-week cancellation).
- **Corrected:** After the First Working Slice, the README claimed the chat experience worked. I corrected it to "Partial" because quick replies, cards and editable fields are not available in iMessage or SMS today.
- **Scoped down:** I chose to make only the first message live AI and leave bill reading and the call simulated, so I could test one real AI behavior well instead of several badly.
- **Filtered feedback:** One peer comment described a memo, an invoice and laptop costs, which are not part of Iris. I marked it as not applicable instead of acting on it.

## Verification

- Reproduced the peer's bug with the exact same message before and after the change (screenshots in `docs/screenshots/`).
- Ran 5 distinct test cases and repeated one input 3 times to see if the live model varies (see `revision.md`).
- Checked the repository for API keys, tokens and passwords before publishing.
- **Still needs checking:** the model has only been tested on a handful of messages; it is not proven accurate. Typos, slang, Spanish messages and unusual carriers have not been tested.

## AI inside the product

| | |
| --- | --- |
| **Task** | Understand what the user wants from their first free-text message |
| **Input** | The user's first message (for example, "I'm moving to Mint Mobile and want to keep my number, can you get me off AT&T?") |
| **Output** | JSON with goal (cancel / switch / unclear), carrier being left, carrier being joined, keep number, confidence, and a one-line restatement that Iris asks the user to confirm |
| **Value** | Users can write naturally instead of tapping menus, and Iris restates the request so mistakes are caught before any call |
| **How it's produced** | The front end sends the first message to `/api/openai/intent` on the app's server, which calls OpenAI gpt-5.4-mini through Replit AI Integrations with a strict extraction prompt and structured JSON output. Nothing is stored. Timeout about 5.5 seconds. |
| **Status** | **Live** for the first message. Falls back to keyword matching if the model fails. Bill reading, retention offer handling and the phone call are **simulated**. The "remind me later" option is **simulated**. Calling real carriers is **planned**. |
