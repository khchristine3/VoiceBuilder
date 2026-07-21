import type { Lead } from "@/lib/leads";

// In-memory only -- resets on server restart, which is fine for a demo.
// Simulates a CRM "contact created" webhook firing this endpoint (fired
// with curl on camera); POST adds a lead, GET lets the UI poll for new
// arrivals without needing a database. In production this would persist
// to a real store and the UI would likely use a websocket/SSE push instead
// of polling -- worth mentioning, not building, for a same-day deadline.
let incomingLeads: Lead[] = [];

export async function POST(req: Request) {
  const body = await req.json();
  const { name, company, role, phone } = body;

  if (!name || !phone) {
    return Response.json({ error: "name and phone are required" }, { status: 400 });
  }

  const lead: Lead = {
    id: `webhook-${Date.now()}`,
    name,
    company: company ?? "",
    role: role ?? "",
    phone,
  };
  incomingLeads = [...incomingLeads, lead];
  return Response.json({ lead }, { status: 201 });
}

export async function GET() {
  return Response.json({ leads: incomingLeads });
}
