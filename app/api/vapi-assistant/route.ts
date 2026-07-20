export async function GET() {
  const res = await fetch(
    "https://api.vapi.ai/assistant/59f32ac2-d6c2-4c5e-a2a6-c84ac2eeff4f",
    { headers: { Authorization: `Bearer ${process.env.VAPI_API_KEY}` } }
  );
  const data = await res.json();
  return Response.json(data);
}