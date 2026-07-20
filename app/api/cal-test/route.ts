export async function GET() {
  try {
    const res = await fetch("https://api.cal.com/v2/event-types", {
      headers: {
        Authorization: `Bearer ${process.env.CAL_API_KEY}`,
        "cal-api-version": "2024-06-14",
      },
    });

    const data = await res.json();
    return Response.json({ status: res.status, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ error: message }, { status: 500 });
  }
}