"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import type { GeneratedFields } from "@/lib/vapiTemplate";
import { MOCK_LEADS, type Lead } from "@/lib/leads";

type HistoryTurn = { role: "user" | "model"; text: string };
type ChatMessage = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [assistantName, setAssistantName] = useState<string | null>(null);
  const [config, setConfig] = useState<GeneratedFields | null>(null);
  const [loading, setLoading] = useState(false);
  const [callActive, setCallActive] = useState(false);
  // null while no call is active, or during the preview (no-lead) call;
  // set to a lead's id for the duration of that lead's call.
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [incomingLeads, setIncomingLeads] = useState<Lead[]>([]);
  const vapiRef = useRef<Vapi | null>(null);
  const seenLeadIds = useRef<Set<string>>(new Set());

  // Vapi's web SDK talks WebRTC (via Daily) directly from the browser, so
  // it can only be created client-side, after mount -- useEffect never runs
  // during Next.js's server-side render pass, unlike the component body.
  useEffect(() => {
    const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_API_KEY!);
    vapi.on("call-start", () => setCallActive(true));
    vapi.on("call-end", () => {
      setCallActive(false);
      setActiveLeadId(null);
    });
    vapiRef.current = vapi;
    return () => {
      vapi.stop();
    };
  }, []);

  // Same web-call logic for both cases: preview passes no lead (the agent
  // greets a generic "there"), a lead call passes that lead's details as
  // variableValues so the agent's {{name}} placeholder resolves to them.
  // Wrapped in useCallback (identity only changes when assistantId does)
  // so the polling effect below can list it as a dependency instead of
  // capturing a stale closure over assistantId.
  const startCall = useCallback(
    (lead?: Lead) => {
      if (!assistantId) return;
      setActiveLeadId(lead?.id ?? null);
      vapiRef.current?.start(assistantId, {
        variableValues: {
          name: lead?.name ?? "there",
          company: lead?.company ?? "",
          role: lead?.role ?? "",
        },
      });
    },
    [assistantId]
  );

  // Simulates a CRM webhook: polls /api/webhooks/lead-created for leads
  // added since the last check (seenLeadIds tracks which we've already
  // handled), and auto-starts a call for the first new one if nothing else
  // is already on a call.
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/webhooks/lead-created");
      const data = await res.json();
      const leads: Lead[] = data.leads ?? [];
      const newLeads = leads.filter((l) => !seenLeadIds.current.has(l.id));
      if (newLeads.length === 0) return;

      newLeads.forEach((l) => seenLeadIds.current.add(l.id));
      setIncomingLeads((prev) => [...prev, ...newLeads]);

      if (!callActive) {
        startCall(newLeads[0]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [callActive, startCall]);

  function endCall() {
    vapiRef.current?.stop();
  }

  async function send() {
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, history, assistantId }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      setHistory((prev) => [
        ...prev,
        { role: "user", text: userMessage },
        { role: "model", text: JSON.stringify(data.config) },
      ]);
      setAssistantId(data.assistant.id);
      setAssistantName(data.assistant.name);
      setConfig(data.config);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
    }
    setLoading(false);
  }

  function renderLeadRow(lead: Lead) {
    const thisLeadActive = callActive && activeLeadId === lead.id;
    return (
      <div
        key={lead.id}
        className="flex items-center justify-between bg-white border rounded px-3 py-2"
      >
        <div>
          <div className="text-sm font-medium">{lead.name}</div>
          <div className="text-xs text-zinc-500">
            {lead.role} · {lead.company}
          </div>
        </div>
        <button
          onClick={() => (thisLeadActive ? endCall() : startCall(lead))}
          disabled={callActive && !thisLeadActive}
          className={`px-3 py-1.5 rounded text-white text-sm disabled:opacity-40 ${
            thisLeadActive ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {thisLeadActive ? "End call" : "Call"}
        </button>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Agent Voice Builder</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 flex flex-col">
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block rounded px-3 py-2 whitespace-pre-wrap ${
                    m.role === "user" ? "bg-black text-white" : "bg-zinc-100"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>

          <textarea
            className="w-full border rounded p-3"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={assistantId ? "Ask for a change..." : "Describe the agent you want..."}
          />

          <button
            onClick={send}
            disabled={loading || !input}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-40"
          >
            {loading ? "Thinking..." : assistantId ? "Send edit" : "Build agent"}
          </button>
        </div>

        <div className="border rounded p-4 space-y-3 bg-zinc-50 h-full">
          <h2 className="font-semibold text-lg">Generated Agent</h2>

          {!config && (
            <p className="text-zinc-500 text-sm">Nothing built yet — describe an agent on the left.</p>
          )}

          {config && (
            <>
              <div>
                <div className="text-xs uppercase text-zinc-500">Name</div>
                <div>{assistantName}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-zinc-500">Voice</div>
                <div>{config.voiceId}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-zinc-500">First message</div>
                <div className="whitespace-pre-wrap">{config.firstMessage}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-zinc-500">System prompt</div>
                <pre className="whitespace-pre-wrap text-sm bg-white border rounded p-2 max-h-64 overflow-y-auto">
                  {config.systemPrompt}
                </pre>
              </div>
              {assistantId && (
                <div className="pt-2 border-t space-y-2">
                  <div className="text-xs text-zinc-400">Vapi assistant id: {assistantId}</div>
                  <button
                    onClick={() => (callActive && activeLeadId === null ? endCall() : startCall())}
                    disabled={callActive && activeLeadId !== null}
                    className={`px-4 py-2 rounded text-white disabled:opacity-40 ${
                      callActive && activeLeadId === null ? "bg-red-600" : "bg-green-600"
                    }`}
                  >
                    {callActive && activeLeadId === null
                      ? "End call"
                      : "Call this agent (preview, browser mic)"}
                  </button>
                </div>
              )}

              {assistantId && (
                <div className="pt-2 border-t space-y-2">
                  <div className="text-xs uppercase text-zinc-500">Leads</div>
                  {MOCK_LEADS.map((lead) => renderLeadRow(lead))}
                </div>
              )}

              {assistantId && incomingLeads.length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <div className="text-xs uppercase text-zinc-500">
                    Incoming (from webhook)
                  </div>
                  {incomingLeads.map((lead) => renderLeadRow(lead))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}