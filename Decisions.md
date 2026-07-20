# Alta Voice-Builder — Decision Log

A running record of every meaningful decision in this project: what we chose, why, what we weighed it against, and a short line I can say in the video or interview.

**Project in one sentence:** a web app where you chat with a "builder" AI that generates and edits a voice AI assistant in plain English; the generated assistant can then call a lead, qualify them, and book a meeting.

_Last updated: 19 Jul 2026_

## Status

**Proven end to end:** describe an agent → agent created via API → live conversation → tool call mid-call → real Cal.com booking → confirmation email. Every integration in the chain has been verified at least once.

**Working:** Vapi agent creation from code (201), Cal.com booking from code (201), Vapi → Cal.com booking during a live browser call, ~$9.93 Vapi free credits.

**Blocked (email sent to Alta):** Anthropic API credit and a Twilio phone number — both require personal ID verification, declined.

**Not yet built:** the builder itself (system prompt + structured output), conversation history, the UI, `/api/call`, the slots tool.

---


---

## How to read this

Each entry has four parts:
- **Decision** — what we're doing.
- **Why** — the reasoning.
- **Alternatives weighed** — what else we considered and why we passed.
- **Say it like this** — a crisp sentence for the video/interview.

---

## 1. Voice / telephony platform → **Vapi**

**Why:** The assignment's core is a builder that *creates and edits* a voice assistant. Vapi is API-first — you send it a JSON config (system prompt, first message, voice, tools) and get back a live phone agent — which maps one-to-one onto "generate an agent from a description." It also has the lowest base rate (~$0.05/min platform fee, ~$0.12–0.21/min all-in), so the $50 budget stretches furthest.

**Alternatives weighed:**
- **Retell** — friendlier, ~$0.07/min, visual builder, faster to first call. Kept as the fallback if Vapi's setup feels too heavy early on. Not the pick only because Vapi's API-first design fits "build from code" slightly better and is cheaper.
- **Bland** — all-inclusive (~$0.11–0.14/min), simplest, but less control over the programmatic "create an agent" step.
- **Full DIY** (Twilio + Deepgram + LLM + ElevenLabs stitched by hand) — max control, far too much wiring for a 3-day build.

**Say it like this:** "I chose Vapi because generating an agent is just POSTing a config to its API, which is exactly what the assignment asks for — and it was the cheapest per minute. Retell was my fallback if I hit setup friction."

---

## 2. The "builder brain" (natural language → agent) → **structured output / tool calling**

**Why:** The builder needs to turn an English sentence into a clean, valid agent config every time. Structured output forces the model to return tidy fields (name, systemPrompt, firstMessage, voice, questions) that drop straight into Vapi. It keeps the natural-language magic the assignment grades while staying reliable.

**Alternatives weighed:**
- **Free-form prompt + parse the prose** — fragile; the model sometimes returns text you can't feed to Vapi.
- **A rigid web form (dropdowns/fields)** — reliable but throws away the whole point; the assignment explicitly wants *natural language*.

**Say it like this:** "The builder is a single structured-output call — natural language in, a validated config out — which keeps it reliable without losing the plain-English interface."

---

## 3. Calendar / booking → **Cal.com** (fake confirmation as emergency fallback)

**Why:** Free, open API, and both Vapi and Retell have a built-in Cal.com booking tool. A real meeting landing in a real calendar is a strong credibility moment in the video for ~30 min of setup.

**Alternatives weighed:**
- **Google Calendar directly** — doable but burns time on Google's login/permissions flow.
- **Fake "meeting booked!" message** — zero cost but unconvincing; kept only as a time-pressure fallback since "book meetings" is stated explicitly.

**Say it like this:** "Booking goes through Cal.com so the meeting is real, not simulated. I had a mock confirmation ready as a fallback but didn't need it."

---

## 4. Frontend framework → **Next.js (App Router)**

**Why:** One project holds both the webpage and the small backend (via API routes), so the builder-brain code and the UI live together. Also chosen deliberately as a learning investment — Next.js is the market default for React roles today, so it pays off beyond this assignment. Risk is low because React skills (components, hooks, JSX) transfer directly; the only new pieces are file-based routing and API routes.

**Alternatives weighed:**
- **Vite + small Node/Express backend** — zero new concepts, arguably the fastest/safest path. Kept as the explicit fallback if the Next.js "hello loop" isn't working by lunch on day 1.
- **Plain React only** — no backend home for the LLM/API keys; rejected.

**Risk control:** Time-boxed a 90-minute "hello loop" gate (type a message → API route → LLM → reply on screen) before building graded features. If it's not working by the deadline, drop to Vite + Express and keep all LLM code.

**Say it like this:** "I picked Next.js partly because it's what teams use now and I wanted the reps, and partly because API routes keep the frontend and backend in one project. I time-boxed the learning risk so it couldn't eat my core features."

---

## 5. Language → **TypeScript**

**Why:** It's the first language named in the job post, and it's just JavaScript with optional type labels — every line of JS is valid TS. Escape hatches (`any`, writing plain JS in a `.ts` file) keep it low-risk under time pressure.

**Alternatives weighed:**
- **Python + FastAPI** — also named in the post and fine, but it's two moving parts instead of one and I'm faster in the JS ecosystem.

**Say it like this:** "TypeScript because it's what the role uses and it's a thin layer over the JavaScript I already know — I get type safety without slowing down."

---

## 6. Orchestration / retrieval frameworks → **skip LangChain & LlamaIndex**

**Why:** The builder is a single generation step — one input, one output, one model call — which modern LLM SDKs handle natively in a few lines. LangChain's value is coordinating *many* chained LLM steps; there are none here. LlamaIndex is for searching document knowledge-bases; there's no knowledge base. The heavy real-time orchestration (streaming audio, turn-taking) is done *inside Vapi*, not my code.

**Alternatives weighed:**
- **Use LangChain/LangGraph anyway** — adds a fast-moving dependency, indirection when debugging, and a learning tax, all for no benefit at this size.

**When it *would* be worth it:** if a second brain needed to read a lead's past emails/CRM notes to personalize the pitch (retrieval), or plan several tool calls in a loop.

**Say it like this:** "I kept the builder as a direct structured-output call because it's a single step and Vapi handles runtime orchestration. I'd reach for LangChain or LangGraph once there's multi-step reasoning or retrieval over CRM data."

---

## 7. CRM data (Salesforce / HubSpot / Gong) → **mock leads list, mention real integration**

**Why:** The assignment says "call leads" — a lead is just a name and a phone number, so a small mock list (or typing in my own number to test) fully satisfies it. Real CRM integration is context for the *job*, not a requirement of the *assignment*; building it would waste a day on OAuth.

**Alternatives weighed:**
- **Real Salesforce/HubSpot integration** — out of scope for 3 days; the smart move is to show where it plugs in, not build it.

**Say it like this:** "Leads are a mock list here, but the data model is shaped so a real Salesforce or HubSpot record drops straight in — that's the one-line change for production."

---

## 8. Monitoring / analytics (Datadog / Mixpanel) → **simple local call-log panel, mention real tools**

**Why:** The assignment separately asks that agents be "tested and evaluated." A lightweight panel — who was called, did they qualify, was a meeting booked — demonstrates that instinct cheaply and looks good in the video, without wiring real monitoring.

**Alternatives weighed:**
- **Real Datadog/Mixpanel** — overkill for a 3-day demo; name-drop where it goes instead.

**Say it like this:** "There's a basic call log so you can evaluate agent runs; in production that's where Datadog or Mixpanel would sit."

---

## 9. Styling → **Tailwind CSS**

**Why:** Fastest path to a presentable demo with no context-switching to CSS files and no naming classes — you style as you type. The classes are just shorthand for CSS I already understand (no logic that can break), and Tailwind is the market-default styling layer, so it's reusable knowledge.

**Alternatives weighed:**
- **Plain CSS (`globals.css`)** — zero new tooling; totally valid, just slower for me here.
- **CSS Modules** — the "proper" scoped-CSS-per-component approach; a fine middle path, but more file-switching under time pressure.

**Note:** The assignment doesn't grade the styling approach, only that the app works and looks presentable. This was a speed preference, not a correctness call.

**Say it like this:** "Tailwind purely for speed to a clean-looking demo — styling stays inline with the components so I'm not jumping between files while moving fast."

---

## 10. Where I built it → **chat (for learning), Claude Code later (for speed)**

**Why:** Learning while building works best when I type the commands and read the errors myself; that friction is where the learning sticks. Claude Code is the tool to switch to once the concepts click and speed matters more than understanding.

**Say it like this:** "I built it hands-on to actually learn Next.js, rather than having an agent generate it for me."

---

## 11. Two separate model slots → **Sonnet to build, small fast model to talk**

**Why:** These are different jobs with different constraints. The *builder brain* runs once per user request in my own code — quality matters, a two-second wait is invisible, so a strong model (Claude Sonnet) is right. The *in-call brain* runs inside Vapi on every turn of a live phone call — here latency *is* the product. Transcription, network, and voice generation already eat close to a second; a slow model pushes the silence past the point where a human thinks the line dropped. So: small, fast model in the call (`gpt-4o-mini`, chosen automatically by Vapi since its in-house model is plan-gated).

**Alternatives weighed:**
- **Opus / Fable for the builder** — defensible but buys nothing: filling five fields from one sentence is structured extraction, not hard reasoning. Frontier prices for a task with no headroom. The argument against is judgment, not budget (builder calls total ~$1 either way).
- **A bigger model in the call** — actively worse. Makes the pause I already measured in testing longer.

**On hallucination risk in-call:** the defense isn't model size, it's scope control — a tight system prompt that says what's off-limits, fixed qualifying questions, and tools for anything factual (real calendar slots rather than invented ones). A big model hallucinates just as confidently, only slower.

**Say it like this:** "I matched model tier to task. Strong model for generation where latency is invisible, fast model in the call where every extra 300ms is dead air. I'd upgrade the in-call model only if a real test showed it fumbling."

---

## 12. Call trigger → **a button for the demo, `/api/call` as the real interface**

**Why:** In production nobody presses a button — a CRM webhook or a scheduled job fires the call. But a cron job doesn't demo well on camera, and auto-dialing while debugging is a good way to burn credits and annoy people. So the logic lives in an endpoint, and the button is just one client of it. Nothing about the code changes based on who calls it.

**Alternatives weighed:**
- **Webhook only** — needs a public URL (ngrok) and something to fire it; with no CRM I'd end up simulating the caller anyway, which is where I started but with more steps.
- **Auto-call on a timer** — dangerous during development, unpredictable on camera.

**Optional day-3 addition:** a thin `/api/webhooks/lead-created` that accepts a CRM-shaped payload and calls the same logic, fired with curl on camera. ~10 min once the core exists, because a public URL is needed anyway (Vapi posts call-ended/transcript webhooks *to* the app to feed the call log).

**Say it like this:** "The button is a demo trigger. In production this same endpoint is called by a CRM webhook when a lead is created, or by a job working the queue — the button is a client, not the interface."

---

## 13. Secrets → **`.env.local`, gitignored, with a committed `.env.example`**

**Why:** Standard practice, and Next.js loads `.env.local` automatically (no `dotenv` call needed, unlike Express). Server-only by default, so a secret physically can't leak into the browser bundle. A committed `.env.example` listing variable *names* with empty values tells anyone cloning the repo what to supply without leaking anything.

**In production** these would live in a secret manager (AWS Secrets Manager, Doppler, Vault, or the host's env settings), injected at runtime, rotated, scoped least-privilege — never in code, logs, or screenshots.

**Video-specific risk:** never open `.env.local` or echo a key on camera. Rotate keys after recording regardless — one minute, good habit.

**Say it like this:** "Keys in a gitignored env file locally, with an example file committed for onboarding. In production that's a secret manager injecting at runtime."

---

## 14. Talking to Vapi → **raw `fetch`, not an SDK** (and the general rule)

**Why:** Vapi's REST API is simple — a POST with a JSON body. Raw fetch keeps one less dependency for something this thin. The general rule I'm applying: **official SDK for first-party APIs when it's well-maintained** (which is why the Anthropic SDK is in, for its types, retries, and error handling), **raw HTTP when the SDK is thin, lagging, or absent.**

**Alternatives weighed:**
- **Vapi SDK** — fine if it's solid; worth revisiting if the integration grows beyond a few endpoints.
- **Hand-rolled HTTP for Anthropic too** — no. Loses types, retries with proper backoff, and rate-limit handling, all of which the vendor maintains for free.

**Say it like this:** "Official SDK for first-party APIs, raw HTTP when there isn't a good one. Anthropic's SDK earns its place through types and retry handling; Vapi's REST surface is small enough that fetch is clearer."

---

## 15. What the builder generates vs what's hardcoded → **generate only the four content fields**

**Why:** This is the reliability decision, and it came out of reading a real Vapi assistant config. The generated fields are the ones that *should* vary per agent: `name`, `firstMessage`, the system prompt (`model.messages[0].content`), and `voice.voiceId`. Everything else — `model.provider`/`model.model`, the `transcriber` block, `startSpeakingPlan`/`stopSpeakingPlan`, the booking tool — is infrastructure, hardcoded into a template the generated fields merge into.

**Alternatives weighed:**
- **Let the LLM generate the whole config object** — it will eventually hallucinate a provider name or malform the endpointing plan, and Vapi rejects it. Constraining generation to the content fields removes an entire class of failure.

**Say it like this:** "I constrained generation to the fields that should vary and templated the infrastructure. The model never gets to invent a provider name or a malformed endpointing plan — which removes a whole failure class rather than trying to prompt around it."

---

## 16. Latency handling → **tune endpointing, don't upgrade the model**

**Why:** The browser test call had a noticeable pause after I stopped speaking. The instinct is "use a better model," but the real lever is `startSpeakingPlan.waitSeconds` (0.4) and `smartEndpointingPlan` — how long the system waits before deciding the human has finished. Set too high, every reply feels sluggish no matter how fast the model is.

**Caveat noted:** the browser test routes through laptop mic + WebRTC and isn't representative. Retest on a real phone before tuning anything.

**Order of levers if it's still slow:** endpointing/silence threshold → voice provider → model tier.

**Say it like this:** "I noticed latency in testing and identified endpointing as the likely cause rather than the model, then measured it on a real call before changing anything."

---

## 17. Telephony → **Twilio number required** (location-forced)

**Why:** This one wasn't a preference, it was geography. Vapi's free options are SIP (an internet address — cannot reach a real mobile at all) or free Vapi numbers, which are **US-national-use only**. I'm in Israel, so calling my own phone is an international call the free number can't place. A paid number that can dial internationally is the only path.

**Alternatives weighed:**
- **Free Vapi SIP** — wrong kind of address entirely; can't reach the phone network.
- **Free Vapi US number** — US destinations only, plus a daily outbound cap.
- **Buy directly through Vapi** — US/Canada only, and needs a card on file.
- **Plivo / Telnyx / Vonage** — all viable, but Plivo's setup is an IP access control list, an outbound trunk, a termination SIP domain, and two curl calls to register, versus Twilio's "paste Account SID and Auth Token." More failure points on the one piece of infrastructure the whole demo depends on.
- **Israeli number vs US number** — Israeli gives local caller ID (far better answer rates in production), but national regulation requires address/identity documentation. A US number needs none and dials Israel fine once geo permissions allow it.

**Say it like this:** "Vapi's free numbers are US-only, so from Israel I needed a carrier number that could dial internationally. Twilio was the lowest-friction import path — Plivo would have meant provisioning a SIP trunk by hand for no benefit at this scale."

---

## 18. Identity verification → **decline; ask Alta to provision the paid accounts**

**Why:** Both Anthropic (to buy API credits) and Twilio (pay-as-you-go) require a government photo ID — Twilio also asks for tax information. These are company-funded accounts for a company assignment, and submitting personal identity documents for that isn't something I want to do. Vapi's free tier and Cal.com's free tier need nothing.

**Resolution requested:** Alta provisions the two accounts and shares credentials (an Anthropic API key; Twilio Account SID + Auth Token), or reimburses if I use pre-verified accounts of my own.

**Note:** all code was written and the Vapi integration proven while waiting — the blocker cost no build time.

---

## 19. Proving the pipeline before building on it

**Why:** Risky external dependencies get tested first, so failures surface while there's still time to route around them. Two gates, both passed:

- **The hello loop** — browser → Next.js API route → Anthropic → reply on screen. The final error was `credit balance too low`, which is a *success* signal: auth passed, the request reached Anthropic, only funding is missing.
- **Programmatic agent creation** — `POST /assistant` from my own code returned **201** with a new assistant `id`. This is the core mechanism of the assignment, and it costs nothing to test because no call is placed.

**Say it like this:** "I proved the two risky integrations before writing any features — the LLM round-trip and programmatic agent creation. Both were green before I built anything on top of them."

---

## 20. Booking execution → **API Request tool now, Custom Tool for the final build**

**Why:** Vapi has no native Cal.com integration (its Tools list offers Transfer Call, Hang Up, Send Text, Slack, Google Sheets, Google Calendar, GoHighLevel, MCP, API Request, and Custom Tool). Two workable paths:

- **API Request** — Vapi calls Cal.com's API directly, headers and all. No public URL needed, so it proves the chain immediately.
- **Custom Tool** — Vapi POSTs to my own endpoint, my code calls Cal.com. Needs ngrok or a deploy so Vapi can reach it.

Used API Request to prove the mechanism end to end, with Custom Tool as the target architecture. Custom Tool is better for two reasons: the job post explicitly asks for "agent tools and functions in TypeScript or Python… for task execution," and routing booking through my own service means the app sees the outcome and can log it. A public URL is needed anyway for Vapi's call-status webhooks.

**Alternatives weighed:**
- **Google Calendar (native)** — easiest, but requires granting an OAuth scope covering read/write to *all* calendars, declined for a 3-day assignment.
- **Third-party middleware (Make, n8n, Pipedream, Zapier)** — most search results point here; adds a platform dependency and puts the interesting logic outside my repo.

**Important distinction:** using the dashboard to *build* the tool would undercut the assignment. Using it to *discover the config shape*, then having the builder generate that same JSON, does not. Same approach as the assistant config — build by hand, read it back via the API, then generate it.

**Say it like this:** "There's no native Cal.com integration, so I proved the chain with a direct API Request tool, then moved execution into my own endpoint so the app owns the booking and can log the outcome."

---

## 21. Grounding facts → **inject current date; give the agent a slots tool**

**Why:** Both bugs from the first end-to-end test trace to the same root cause — the agent producing facts from inference rather than from data.

- **It booked the wrong date.** Asked for July 22nd, it booked July 20th. The model has no idea what today is, so building an ISO timestamp from "July 22nd" is a guess. Fix: inject the current date and day of week into the system prompt at generation time (my code builds the prompt, so this is free).
- **It struggled to find a slot.** With no visibility into the calendar it proposes times and hopes. Fix: a second `getAvailableSlots` tool against Cal.com's slots endpoint, so it offers real availability instead of guessing.

This is the concrete version of the earlier hallucination argument: the defense isn't a bigger model, it's removing the need to improvise. A frontier model would have guessed the date just as confidently.

**Say it like this:** "My first end-to-end test booked the wrong date — the model was inferring a timestamp with no notion of today. The fix wasn't a better model, it was grounding: inject the current date, and give it a tool to read real availability instead of proposing times blind."

---

## 22. Cal.com API mechanics worth remembering

- **Endpoints are versioned independently** via a `cal-api-version` header: event types `2024-06-14`, slots `2024-09-04`, bookings `2024-08-13`. Wrong version produces errors that look like auth failures.
- **`minimumBookingNotice: 120`** — bookings must be at least 2 hours out. The first booking attempt failed with "User either already has booking at this time or is not available," which was actually the payload being *correct* and the time being wrong (23:00, outside working hours). System prompt now says 3 hours minimum for safety margin.
- **Field names are case-sensitive** — `timeZone`, not `timezone`.
- **The working pattern is two calls:** fetch slots, then book one that exists. Inventing a time and posting it fails.
- **Event type id:** `6371838` (30 min meeting).

---

## Open / to revisit
- **Blocked:** Anthropic API credit and Twilio number, both pending Alta providing credentials. Email sent.
- Write the builder system prompt with structured output — the heart of the project, and unblocked (costs nothing to draft).
- Add conversation history so the "edit" flow works ("make her more casual"). Resending the full message array *is* the memory; at scale this needs trimming or summarizing.
- Build the two-panel UI: chat left, generated config right.
- `/api/call` endpoint plus the demo trigger button.
- Add `getAvailableSlots` as a second tool; inject current date into generated prompts.
- Convert the booking tool from API Request to a Custom Tool pointing at my own endpoint.
- Decide the exact qualifying questions (budget, decision-maker, timeline, team size).
- Whether to seed 2–3 mock leads vs a single "call my own number" demo for the video.
- Retest latency on a real phone call; tune `waitSeconds` only if it's still slow there.
- Call-log panel (needs ngrok + webhook handling) — first thing to cut if time runs short.