"use client";

import { useState } from "react";
import type { GeneratedFields } from "@/lib/vapiTemplate";

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

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Alta Voice Builder</h1>

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
                <div className="text-xs text-zinc-400 pt-2 border-t">
                  Vapi assistant id: {assistantId}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}