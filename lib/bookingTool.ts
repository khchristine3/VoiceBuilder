// Defines and provisions the bookMeeting tool in code rather than pointing
// at a UUID hand-created in the Vapi dashboard. Still an apiRequest tool
// hitting Cal.com directly — CLAUDE.md item 6 replaces this with a Custom
// Tool pointing at our own endpoint once there's a public URL to receive
// Vapi's calls, which is needed anyway for call-status webhooks.
//
// The dashboard-built version this replaces had "name " and "timeZone "
// (trailing spaces) in its body schema — a typo from hand-editing the
// dashboard's field editor. Cal.com's real field names are "name" and
// "timeZone" (confirmed working in app/api/cal-book-test/route.ts), so
// that's fixed here rather than reproduced.

const TOOL_NAME = "bookMeeting";
const CAL_EVENT_TYPE_ID = 6371838;

function bookMeetingToolDefinition() {
  return {
    type: "apiRequest",
    name: TOOL_NAME,
    function: {
      name: "api_request_tool",
      description:
        "Books a 30-minute demo meeting. Use this after the lead has agreed to a specific date and time. Requires the lead's full name, email address, and the meeting start time in ISO 8601 format.",
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
            "Meeting start time in ISO 8601 format with timezone offset, for example 2026-07-21T11:30:00.000+03:00",
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

type VapiToolSummary = { id: string; name?: string; type?: string };

// Looks for an existing bookMeeting tool before creating one, so repeated
// builder generations reuse the same tool instead of piling up duplicates
// in the Vapi dashboard.
export async function ensureBookingTool(): Promise<string> {
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
    ? (tools as VapiToolSummary[]).find((t) => t.name === TOOL_NAME && t.type === "apiRequest")
    : undefined;
  if (existing) return existing.id;

  const createRes = await fetch("https://api.vapi.ai/tool", {
    method: "POST",
    headers,
    body: JSON.stringify(bookMeetingToolDefinition()),
  });
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create bookMeeting tool: ${JSON.stringify(created)}`);
  }
  return created.id;
}
