"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    setReply("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    });
    const data = await res.json();
    setReply(res.ok ? data.reply : `Error: ${data.error}`);
    setLoading(false);
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-bold">Alta Voice Builder</h1>

      <textarea
        className="w-full border rounded p-3"
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Say something..."
      />

      <button
        onClick={send}
        disabled={loading || !input}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-40"
      >
        {loading ? "Thinking..." : "Send"}
      </button>

      {reply && <pre className="whitespace-pre-wrap border rounded p-3">{reply}</pre>}
    </main>
  );
}