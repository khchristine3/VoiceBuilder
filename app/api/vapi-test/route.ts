export async function GET() {
  try {
    const res = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "API Test Agent",
        firstMessage: "Hi, this is a test.",
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "You are a test assistant." }],
        },
        voice: { provider: "vapi", voiceId: "Elliot" },
      }),
    });

    const data = await res.json();
    return Response.json({ status: res.status, data });
  } catch (err) {
  const message = err instanceof Error ? err.message : "Something went wrong";
  return Response.json({ error: message }, { status: 500 });
  }
}