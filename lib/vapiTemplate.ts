// Infrastructure for turning the builder's four generated fields into a full
// Vapi assistant-creation payload. See CLAUDE.md #15: the model only ever
// generates name / firstMessage / systemPrompt / voiceId — everything else
// here is a fixed template so the model can't hallucinate a bad provider
// name or a malformed endpointing plan.

// Every voiceId Vapi's built-in "vapi" voice provider currently supports.
// Kept as a real list (not free text) so the model can only pick a voice
// that will actually be accepted, not invent one.
//
// Pulled from a live 400 response ("voice.voiceId must be one of the
// following values: ..."), not from Vapi's own docs page — that page listed
// different names entirely (e.g. "Clara New" instead of "Clara") and was
// wrong. The API's own validation error is the source of truth here.
export const VOICE_IDS = [
  "Clara",
  "Godfrey",
  "Elliot",
  "Savannah",
  "Nico",
  "Kai",
  "Emma",
  "Sagar",
  "Neil",
  "Layla",
  "Sid",
  "Gustavo",
  "Kylie",
  "Rohan",
  "Lily",
  "Hana",
  "Neha",
  "Cole",
  "Harry",
  "Paige",
  "Spencer",
  "Naina",
  "Leah",
  "Tara",
  "Jess",
  "Leo",
  "Dan",
  "Mia",
  "Zac",
  "Zoe",
] as const;

export type VoiceId = (typeof VOICE_IDS)[number];

// Cal.com event type + timezone this booking tool was built against (see
// DECISIONS.md #22). Not something the model should ever be asked to guess.
const BOOKING_TIMEZONE = "Asia/Jerusalem";
const BOOKING_UTC_OFFSET = "+03:00";

export type GeneratedFields = {
  name: string;
  firstMessage: string;
  /** Persona + qualification flow only — no booking mechanics or compliance boilerplate. */
  systemPrompt: string;
  voiceId: VoiceId;
};

function todayInBookingTimezone(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

// Appended to whatever the model generates for systemPrompt. Booking
// mechanics are exact operational facts (timezone, notice period, today's
// date) that the model has no way to know and shouldn't be trusted to copy
// precisely every time, so they're assembled here instead of generated.
// Same grounding fix as DECISIONS.md #21, applied from the start instead of
// discovered by a bad booking later.
function bookingFooter(): string {
  return `## Scheduling context
- Today is ${todayInBookingTimezone()}.

## Demo booking
- If qualified, collect: full name, work email, preferred day and time.
- Meetings must be at least 3 hours from now. Do not offer sooner.
- Once you have name, email, and a specific time, call the bookMeeting tool.
- For the start parameter, use ISO 8601 format with the ${BOOKING_UTC_OFFSET} timezone offset.
- For timeZone, use "${BOOKING_TIMEZONE}".
- After the tool succeeds, confirm the booking out loud with the day and time.
- If the tool fails, apologize and offer a different time.

## Compliance
- Do not misrepresent yourself. Do not mention internal tools or systems.`;
}

export function buildAssistantPayload(fields: GeneratedFields, bookMeetingToolId: string) {
  return {
    name: fields.name,
    firstMessage: fields.firstMessage,
    voice: {
      provider: "vapi",
      voiceId: fields.voiceId,
      version: "2",
    },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 200,
      toolIds: [bookMeetingToolId],
      messages: [
        {
          role: "system",
          content: `${fields.systemPrompt}\n\n${bookingFooter()}`,
        },
      ],
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
      fallbackPlan: { autoFallback: { enabled: true } },
    },
    startSpeakingPlan: {
      waitSeconds: 0.4,
      smartEndpointingPlan: {
        provider: "livekit",
        waitFunction: "2000 / (1 + exp(-10 * (x - 0.5)))",
      },
    },
    stopSpeakingPlan: {
      numWords: 0,
      voiceSeconds: 0.2,
      backoffSeconds: 1,
    },
  };
}
