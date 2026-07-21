// Defines and provisions the Vapi tools that call Cal.com, in code rather
// than pointing at UUIDs hand-created in the Vapi dashboard. Both are still
// apiRequest tools hitting Cal.com directly — CLAUDE.md item 4 replaces
// bookMeeting with a Custom Tool pointing at our own endpoint once there's
// a public URL to receive Vapi's calls, which is needed anyway for
// call-status webhooks.
//
// The dashboard-built bookMeeting tool this replaces had "name " and
// "timeZone " (trailing spaces) in its body schema — a typo from
// hand-editing the dashboard's field editor. Cal.com's real field names are
// "name" and "timeZone" (confirmed working in app/api/cal-book-test/route.ts),
// so that's fixed here rather than reproduced.

const CAL_EVENT_TYPE_ID = 6371838;
const BOOKING_TIMEZONE = "Asia/Jerusalem";

const BOOK_MEETING_TOOL_NAME = "bookMeeting";
const GET_AVAILABLE_SLOTS_TOOL_NAME = "getAvailableSlots";

function bookMeetingToolDefinition() {
  return {
    type: "apiRequest",
    name: BOOK_MEETING_TOOL_NAME,
    function: {
      name: "api_request_tool",
      description:
        "Books a 30-minute demo meeting. Use this after the lead has agreed to a specific date and time returned by getAvailableSlots. Requires the lead's full name, email address, and the meeting start time in ISO 8601 format.",
    },
    messages: [{ type: "request-start", blocking: false }],
    url: "https://api.cal.com/v2/bookings",
    method: "POST",
    headers: {
      type: "object",
      properties: {
        "Content-Type": { type: "string", value: "application/json" },
        Authorization: { type: "string", value: `Bearer ${process.env.CAL_API_KEY}` },
        "cal-api-version": { type: "string", value: "2024-08-13" },
      },
    },
    body: {
      type: "object",
      required: ["start", "attendee"],
      properties: {
        start: {
          description:
            "Meeting start time in ISO 8601 format with timezone offset, for example 2026-07-21T11:30:00.000+03:00. Must be a time returned by getAvailableSlots — never invent one.",
          type: "string",
          default: "",
        },
        attendee: {
          description: "The lead's contact details",
          type: "object",
          required: ["name", "email", "timeZone"],
          properties: {
            name: { description: "The lead's full name", type: "string", default: "" },
            email: { description: "The lead's email address", type: "string", default: "" },
            timeZone: {
              description: "The lead's timezone in IANA format, for example Asia/Jerusalem",
              type: "string",
              default: "",
            },
          },
        },
      },
    },
    parameters: [{ key: "eventTypeId", value: CAL_EVENT_TYPE_ID }],
  };
}

// A GET apiRequest tool. Cal.com's API ignores request bodies on GET
// requests (standard REST behavior), and Vapi's apiRequest tool has no
// separate query-parameter concept — only a request body, confirmed by
// inspecting the tool in the Vapi dashboard and by a live call where the
// LLM's tool-call arguments were correct but Cal.com received nothing at
// all (reproduced by hitting the endpoint with zero query params and
// getting the identical error). So the query string is built entirely
// server-side and baked into a static URL — same grounding principle as
// injecting "today is ..." into the system prompt, applied to the search
// window too, and it sidesteps the GET-body problem entirely since nothing
// needs to be dynamically inserted into the request at call time.
//
// Tradeoff: because ensureTool() reuses an existing tool by name rather
// than recreating it, this window is fixed at whichever moment the tool
// was first created, not recomputed on every generation. NINETY_DAY_WINDOW
// makes that a non-issue for a project due today, but it's worth knowing
// this tool would need deleting and recreating (or converting to the
// Custom Tool architecture in CLAUDE.md item 4) to stay accurate long-term.
const SLOTS_SEARCH_START_OFFSET_MS = 3 * 60 * 60 * 1000; // 3h from now, same margin as bookMeeting
const SLOTS_SEARCH_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function getAvailableSlotsToolDefinition() {
  const start = new Date(Date.now() + SLOTS_SEARCH_START_OFFSET_MS).toISOString();
  const end = new Date(Date.now() + SLOTS_SEARCH_START_OFFSET_MS + SLOTS_SEARCH_WINDOW_MS).toISOString();
  const url =
    `https://api.cal.com/v2/slots?eventTypeId=${CAL_EVENT_TYPE_ID}` +
    `&timeZone=${encodeURIComponent(BOOKING_TIMEZONE)}` +
    `&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  return {
    type: "apiRequest",
    name: GET_AVAILABLE_SLOTS_TOOL_NAME,
    function: {
      name: "api_request_tool",
      description:
        "Looks up real available meeting slots for the next 90 days. Call this before offering the lead any specific day or time — never propose a time without checking here first. Takes no arguments.",
    },
    messages: [{ type: "request-start", blocking: false }],
    url,
    method: "GET",
    headers: {
      type: "object",
      properties: {
        Authorization: { type: "string", value: `Bearer ${process.env.CAL_API_KEY}` },
        "cal-api-version": { type: "string", value: "2024-09-04" },
      },
    },
  };
}

type VapiToolSummary = { id: string; name?: string; type?: string };

// Looks for an existing tool by name before creating one, so repeated
// builder generations reuse the same tool instead of piling up duplicates
// in the Vapi dashboard.
async function ensureTool(name: string, buildDefinition: () => unknown): Promise<string> {
  const headers = {
    Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const listRes = await fetch("https://api.vapi.ai/tool", { headers });
  const tools: unknown = await listRes.json();
  if (!listRes.ok) {
    throw new Error(`Failed to list Vapi tools: ${JSON.stringify(tools)}`);
  }

  const existing = Array.isArray(tools)
    ? (tools as VapiToolSummary[]).find((t) => t.name === name && t.type === "apiRequest")
    : undefined;
  if (existing) return existing.id;

  const createRes = await fetch("https://api.vapi.ai/tool", {
    method: "POST",
    headers,
    body: JSON.stringify(buildDefinition()),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create ${name} tool: ${JSON.stringify(created)}`);
  }
  return created.id;
}

export function ensureBookingTool(): Promise<string> {
  return ensureTool(BOOK_MEETING_TOOL_NAME, bookMeetingToolDefinition);
}

export function ensureSlotsTool(): Promise<string> {
  return ensureTool(GET_AVAILABLE_SLOTS_TOOL_NAME, getAvailableSlotsToolDefinition);
}
