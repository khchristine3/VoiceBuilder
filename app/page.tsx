"use client";

import { useState } from "react";

type HistoryTurn = { role: "user" | "model"; text: string };
type ChatMessage = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [assistantId, setAssistantId] = useState<string | null>(null);
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
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
    }
    setLoading(false);
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Alta Voice Builder</h1>

      <div className="space-y-2">
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
    </main>
  );
}