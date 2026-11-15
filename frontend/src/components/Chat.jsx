import { useEffect, useRef, useState } from "react";
import { streamChat } from "../api";
import Message from "./Message";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const updateLast = (fn) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)));

  async function send(e) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    const history = messages
      .filter((m) => m.content && !m.error)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", sources: [], pending: true },
    ]);
    setInput("");
    setBusy(true);

    try {
      for await (const event of streamChat(question, history)) {
        if (event.type === "sources") updateLast((m) => ({ ...m, sources: event.sources }));
        else if (event.type === "token") updateLast((m) => ({ ...m, content: m.content + event.text }));
        else if (event.type === "error") updateLast((m) => ({ ...m, error: event.message }));
      }
    } catch (err) {
      updateLast((m) => ({ ...m, error: err.message }));
    } finally {
      updateLast((m) => ({ ...m, pending: false }));
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) send(e);
  }

  return (
    <main className="chat">
      <div className="thread" aria-live="polite">
        {messages.length === 0 && <p className="empty">Ask a question about your documents.</p>}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send}>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          aria-label="Your question"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </main>
  );
}
