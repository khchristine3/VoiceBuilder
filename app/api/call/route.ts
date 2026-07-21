// Places a real outbound PSTN call via Vapi. Written and shown per the
// project brief, but never executed — provisioning a phone number that can
// dial internationally required government ID verification, declined (see
// DECISIONS.md #17, #18, #27). In production, the same endpoint is what a
// CRM webhook or scheduled job would call when a lead is ready to be
// dialed; the demo instead uses a client-side web call (see app/page.tsx).
//
// Field names (assistantId, phoneNumberId, customer.number) confirmed
// against @vapi-ai/web's bundled CreateCallDTO/CreateCustomerDTO types,
// not docs — this endpoint can't be live-tested without a real number.
export async function POST(req: Request) {
  try {
    const { assistantId, phoneNumberId, customerNumber, customerName } = await req.json();

    if (!assistantId || !phoneNumberId || !customerNumber) {
      return Response.json(
        { error: "assistantId, phoneNumberId, and customerNumber are required" },
        { status: 400 }
      );
    }

    const vapiRes = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId,
        phoneNumberId,
        customer: { number: customerNumber, name: customerName },
      }),
    });
    const call = await vapiRes.json();

    if (!vapiRes.ok) {
      console.error("Vapi rejected the call:", call);
      return Response.json({ error: "Vapi rejected the call", details: call }, { status: 502 });
    }

    return Response.json({ call });
  } catch (err) {
    console.error("Call error:", err);
    const m = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ error: m }, { status: 500 });
  }
}
