
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
    });

    return Response.json({ reply: response.text });
  } catch (err) {
    console.error("Gemini error:", err);
    const m = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ error: m }, { status: 500 });
  }
}