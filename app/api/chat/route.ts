import { GoogleGenAI, Type } from "@google/genai";
import { buildAssistantPayload, VOICE_IDS, type GeneratedFields } from "@/lib/vapiTemplate";
import { ensureBookingTool, ensureSlotsTool } from "@/lib/calTools";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BUILDER_INSTRUCTIONS = `You are the "builder" for a voice AI platform. The user describes, in plain English, a voice agent that should call sales leads, qualify them, and try to book a meeting. Turn their description into the fields defined by the response schema.

If earlier turns in this conversation already contain a generated JSON result, the user's new message is an edit request (e.g. "make her more casual", "add a budget question") — start from that previous JSON and change only what they asked for, keeping everything else the same.

Rules:
- message: a short, friendly reply confirming what you built or changed, shown to the user in the builder chat (e.g. "Done — I've set up an agent that..." or "Done — made her tone more casual."). This is never spoken by the voice agent.
- name: a short, human-readable label for this agent (not a person's name unless the user gives one).
- firstMessage: the exact opening line the agent will speak out loud when the call connects. Keep it to one or two sentences and naturally introduce why they're calling.
- systemPrompt: instructions for the persona, tone, and qualification flow only — write it as instructions to the agent, covering who they are, how they should sound, and the specific questions they should ask to qualify this kind of lead (e.g. budget, decision-making authority, timeline, team size — pick whichever fit what the user described). Do NOT write anything about booking mechanics, timezones, tool calls, or compliance — that is handled separately and appended automatically.
- voiceId: choose the single best-matching voice from the allowed list based on any persona cues in the user's description (gender, tone, energy). If nothing is specified, pick a natural, professional default.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    name: { type: Type.STRING },
    firstMessage: { type: Type.STRING },
    systemPrompt: { type: Type.STRING },
    voiceId: { type: Type.STRING, enum: [...VOICE_IDS] },
  },
  required: ["message", "name", "firstMessage", "systemPrompt", "voiceId"],
};

type BuilderOutput = GeneratedFields & { message: string };
type HistoryTurn = { role: "user" | "model"; text: string };

export async function POST(req: Request) {
  try {
    const {
      message,
      history,
      assistantId,
    }: { message: string; history?: HistoryTurn[]; assistantId?: string | null } = await req.json();

    const contents = [
      ...(history ?? []).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const generation = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: BUILDER_INSTRUCTIONS,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const rawText = generation.text;
    if (!rawText) {
      console.error("Gemini returned no text", generation);
      return Response.json(
        { error: "The model returned an empty response — nothing to build from" },
        { status: 502 }
      );
    }

    const { message: builderMessage, ...config } = JSON.parse(rawText) as BuilderOutput;
    const [bookMeetingToolId, getAvailableSlotsToolId] = await Promise.all([
      ensureBookingTool(),
      ensureSlotsTool(),
    ]);
    const payload = buildAssistantPayload(config, [bookMeetingToolId, getAvailableSlotsToolId]);

    const isEdit = Boolean(assistantId);
    const vapiRes = await fetch(
      isEdit ? `https://api.vapi.ai/assistant/${assistantId}` : "https://api.vapi.ai/assistant",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    const assistant = await vapiRes.json();

    if (!vapiRes.ok) {
      console.error("Vapi rejected assistant:", assistant);
      return Response.json(
        { error: "Vapi rejected the generated assistant", details: assistant },
        { status: 502 }
      );
    }

    return Response.json({
      reply: builderMessage,
      assistant: { id: assistant.id, name: assistant.name },
      config,
    });
  } catch (err) {
    console.error("Builder error:", err);
    const m = err instanceof Error ? err.message : "Something went wrong";
    return Response.json({ error: m }, { status: 500 });
  }
}
