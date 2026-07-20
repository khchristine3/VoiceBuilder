# Project brief

## What this is

A take-home assignment for an AI Engineer role at Alta (an AI-native GTM platform whose product is autonomous SDR/RevOps voice agents).

**The assignment, verbatim:** "Build a platform where users can chat with an AI builder that creates and edits a voice AI assistant using natural language. The flow should demonstrate how a user describes the desired agent, how the system generates it, and how the assistant can call leads, qualify them, and book meetings."

There are **two AIs stacked on each other**, and keeping them distinct is the key to the whole design:

1. **The builder AI** — a chat interface. The user types "make me an agent that calls SaaS leads, checks budget and decision-maker authority, and books a demo." This AI does not make calls. It turns that sentence into a *configuration*.
2. **The voice agent** — what the builder just produced. It dials a lead, talks out loud, qualifies them, and books a meeting.

The config the builder writes **is** the voice agent. That's the core mechanism.

Deliverable is a video demo hitting five beats in order: describe → generate → call → qualify → book.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind** — one project holds UI and backend via API routes
- **Gemini 3 Flash** (`gemini-3-flash-preview`) — the builder brain, via `@google/genai`
- **Vapi** — voice platform. Assistants are created by POSTing JSON to `https://api.vapi.ai/assistant`
- **Cal.com** — real meeting booking via its v2 API
- **In-call model is `gpt-4o-mini`**, running inside Vapi (not in this codebase)

Env vars in `.env.local` (gitignored, documented in `.env.example`): `GEMINI_API_KEY`, `VAPI_API_KEY`, `CAL_API_KEY`.

## What already works — do not re-litigate these

Every external integration has been verified at least once:

- **The builder, end to end** — `app/api/chat/route.ts`: plain English → Gemini structured output → merged into the Vapi template (`lib/vapiTemplate.ts`) → `POST /assistant` → a real assistant, with the bookMeeting tool provisioned in code (`lib/bookingTool.ts`) rather than a hardcoded id. This is the core mechanism of the assignment and it is proven.
- **Cal.com booking from code** — fetch real availability, then book a slot. Returns 201, real booking, confirmation email.
- **Full chain: Vapi agent → tool call mid-conversation → Cal.com booking.** Tested through Vapi's browser "Talk" button, before the tool was moved into code. Not yet re-tested against a builder-generated assistant.

## Working rules

- Never describe the contents, history, or shape of a file or API
  response you haven't actually read. If you're inferring, say so
  explicitly and verify before writing code that depends on it.
- Before writing code against an external API, confirm the real
  response shape by calling it — don't rely on docs or memory.
  Model IDs, field names, and response envelopes go stale.
- When a claim in a commit message or comment asserts a fact
  (what a file used to contain, what a provider supports), verify
  it first.
- No Conventional Commits prefixes. Plain descriptive messages.
- After any real decision, log it in DECISIONS.md: what was chosen,
  why, what was weighed against it.
  
## Hard constraints

- **No real phone number.** Every telephony carrier (Twilio, Telnyx, Plivo) requires government photo ID for verification. This was declined — these are accounts for a company assignment, not personal use. Alta's recruiter confirmed they can't provide credentials either. Vapi's free numbers are US-national-use only and the test phone is Israeli, so they can't help.
  - **Consequence:** the demo uses **Vapi web calls** (the `@vapi-ai/web` SDK) embedded in the app, not PSTN. The `/api/call` endpoint for real phone calls should still be *written* and shown in the video, just not executed. The honest framing: "the same endpoint places a real PSTN call with a `phoneNumberId`; provisioning a number required personal identity documents I chose not to submit."
- **Anthropic was the original plan** and was swapped for Gemini for the same reason — no free tier, and buying credits required ID verification.
- **Budget:** the project now costs $0. Vapi has ~$9.93 in free credits; Cal.com and Gemini are free tiers.
- Timeline is tight. Prefer shipping the five assignment beats over adding features.

## Architectural decisions that must be preserved

**Generate only the fields that should vary.** The builder generates exactly four things: `name`, `firstMessage`, the system prompt (`model.messages[0].content`), and `voice.voiceId`, via `responseSchema`-constrained output (see `RESPONSE_SCHEMA` in `app/api/chat/route.ts`; `voiceId` is a real enum pulled from Vapi's own validation error, not its docs). Everything else — `model.provider`/`model.model`, the `transcriber` block, `startSpeakingPlan`/`stopSpeakingPlan`, and the tool definitions — is a hardcoded template (`lib/vapiTemplate.ts`) the generated fields merge into. If the model is allowed to emit the whole config it will eventually hallucinate a provider name or malform the endpointing plan and Vapi will reject it. This removes an entire failure class rather than prompting around it.

**Use structured output.** The builder is a single generation step: one input, one output, one model call. Gemini's `responseSchema` / JSON mode enforces the shape. Do **not** introduce LangChain or LlamaIndex — there is no multi-step chain and no retrieval corpus, and Vapi handles the runtime orchestration. (Worth being able to say when they *would* apply: multi-step reasoning, or retrieval over CRM data.)

**Model tier matches task.** Strong model for generation (latency invisible), small fast model in-call (every extra 300ms is dead air on a phone call). Don't "upgrade" the in-call model.

**Ground facts rather than trusting the model.** Real bugs found in testing, all from inferring instead of reading data:
- It booked July 20 when asked for July 22 — the model has no idea what today is. **Fixed:** the current date/day-of-week is injected into a hardcoded booking-mechanics footer appended to every generated system prompt (`bookingFooter()` in `lib/vapiTemplate.ts`), not left for the model to guess.
- It struggled to find a slot because it can't see the calendar. **Not yet fixed:** needs a second `getAvailableSlots` tool so it offers real availability instead of guessing.
- Vapi's voice-provider docs page listed the wrong voiceIds entirely (and a wrong claim about Rohan/version 2). A live 400 response from `POST /assistant` was the source of truth instead — see DECISIONS.md #25 and the **Working rules** above.

**Official SDK for first-party APIs, raw `fetch` when the SDK is thin.** Gemini uses `@google/genai`; Vapi and Cal.com use raw `fetch` (small REST surfaces).

**The button is a demo trigger, not the interface.** Call logic lives in `/api/call`. In production a CRM webhook or a scheduled job hits the same endpoint. Optionally add `/api/webhooks/lead-created` accepting a CRM-shaped payload, fired with curl on camera.

## Cal.com API gotchas (learned the hard way)

- Endpoints are versioned **independently** via a `cal-api-version` header: event types `2024-06-14`, slots `2024-09-04`, bookings `2024-08-13`. Wrong version produces errors that look like auth failures.
- `minimumBookingNotice: 120` — bookings must be at least 2 hours out. The generated system prompt tells the agent 3 hours, for margin.
- Field names are case-sensitive: `timeZone`, not `timezone`.
- The working pattern is **two calls**: fetch slots, then book one that exists. Posting an invented time fails.
- Event type id: `6371838` (30 min meeting).

## Existing files

- `app/api/chat/route.ts` — the builder endpoint: Gemini structured output → `lib/vapiTemplate.ts` merge → `lib/bookingTool.ts` for the tool id → `POST /assistant`. Create-only for now (see DECISIONS.md #23).
- `lib/vapiTemplate.ts` — the hardcoded assistant template and `buildAssistantPayload()` merge function; also owns `VOICE_IDS`.
- `lib/bookingTool.ts` — defines the bookMeeting tool and `ensureBookingTool()`, which reuses an existing tool by name instead of creating duplicates.
- `app/page.tsx` — minimal chat UI (not yet the two-panel layout; the API already returns `{ reply, assistant, config }` to support it)
- `app/api/vapi-test/route.ts`, `app/api/vapi-assistant/route.ts`, `app/api/cal-test/route.ts`, `app/api/cal-book-test/route.ts` — **manual probe routes, not automated tests.** Each is a GET hit in the browser to verify one integration. Keep them; they document what was verified.
- `reference/` — a Vapi assistant config and the bookMeeting tool config, both captured from the dashboard via the API (not hand-typed), used to derive the templates above. The tool capture had a live Cal.com key redacted before committing.
- `DECISIONS.md` — full decision log with alternatives weighed and interview soundbites. **Keep this updated as new decisions are made** — it's used for the video narration and interview prep.

## What's left to build

In priority order:

1. **Test a builder-generated assistant end to end via Vapi's browser "Talk" button.** Not yet done — the earlier successful booking (call → tool call → Cal.com confirmation) used the hand-built assistant and the dashboard-created tool, before either was replaced by generated/code-provisioned versions. Confirms the new builder output actually works as a live agent, not just that `POST /assistant` returns 201.
2. **Conversation history + edit path.** Required for the "edits" half of the brief — "make her more casual, add a budget question" only works if the model can see what it built, and `/api/chat` needs a PATCH-style path for updating an existing assistant instead of always creating a new one. (At scale, history needs trimming/summarizing — worth mentioning, not building.)
3. **`getAvailableSlots` tool**, alongside the existing `bookMeeting` tool in `lib/bookingTool.ts`. Ahead of the UI: a booking that fails on camera is worse than a plainer interface, and this is the shorter task.
4. **Two-panel UI** — chat left, generated config right, so the reviewer watches natural language become a structured callable agent. This is the moment that sells the demo.
5. **`/api/call`** plus the web-call trigger button, using `@vapi-ai/web`.
6. **Convert the booking tool from `apiRequest` to a custom tool** pointing at an owned endpoint, so the app performs the booking and can log the outcome. Needs ngrok or a deploy. Better story — the job post explicitly asks for "agent tools and functions in TypeScript."
7. **Call-log panel** — who was called, did they qualify, was a meeting booked. First thing to cut if time runs short. (Gestures at where Datadog/Mixpanel would sit in production.)
8. **README** — write last, describing what actually shipped. Include a limitations section (web calls not PSTN, mocked leads).

## Things deliberately out of scope

- **CRM integration** (Salesforce/HubSpot/Gong). Named in the job description as context for the role, not required by the assignment. A lead is a name and a phone number — a mock list satisfies it. Shape the data model so a real CRM record drops in, and say so on camera.
- **Real monitoring** (Datadog/Mixpanel). The call-log panel gestures at it.
- **Multilingual.** English only; it's a config flag, not a rearchitecture.

## Working style

The user is learning Next.js and TypeScript during this project (comfortable with JavaScript, React and Node). Explain the Next.js-specific and TypeScript-specific parts; don't explain React basics. Prefer small steps that can be verified in the browser over large refactors. Flag anything interesting-but-unnecessary as "worth learning later" and keep moving — there's a deadline.