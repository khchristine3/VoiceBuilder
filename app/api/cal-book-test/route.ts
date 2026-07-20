export async function GET() {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.CAL_API_KEY}`,
      "Content-Type": "application/json",
    };

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const slotsRes = await fetch(
      `https://api.cal.com/v2/slots?eventTypeId=6371838&start=${start}&end=${end}&timeZone=Asia/Jerusalem`,
      { headers: { ...headers, "cal-api-version": "2024-09-04" } }
    );
    const slotsData = await slotsRes.json();

    const days = slotsData?.data ?? {};
    const firstDay = Object.keys(days)[0];
    const firstSlot = firstDay ? days[firstDay][0] : null;

    if (!firstSlot) {
      return Response.json({ step: "slots", status: slotsRes.status, slotsData });
    }

    const bookRes = await fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: { ...headers, "cal-api-version": "2024-08-13" },
      body: JSON.stringify({
        start: firstSlot.start ?? firstSlot,
        eventTypeId: 6371838,
        attendee: {
          name: "Test Lead",
          email: "test@example.com",
          timeZone: "Asia/Jerusalem",
        },
      }),
    });

    const bookData = await bookRes.json();
    return Response.json({ bookedSlot: firstSlot, status: bookRes.status, bookData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ error: message }, { status: 500 });
  }
}