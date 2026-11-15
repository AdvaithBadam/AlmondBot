import { useEffect, useRef, useState } from "react";
import { streamChat } from "../api";
import Message from "./Message";

function Empty({ info, offline }) {
  let note = null;
  if (offline) {
    note = (
      <>
        The backend isn't reachable. Start it with <code>uvicorn backend.app.main:app --port 8000</code>.
      </>
    );
  } else if (info && info.documents.length === 0) {
    note = (
      <>
        No documents are indexed yet. Put PDFs in <code>data/pdf/</code>, run{" "}
        <code>python rag/scripts/ingest.py</code>, then reload this page.
      </>
    );
  }

  return (
    <div className="empty">
      <h2>AlmondBot</h2>
      <p>Context based answering bot</p>
      {note && <p className="empty-note">{note}</p>}
    </div>
  );
}

export default function Chat({ hidden, info, offline }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Grow the textarea with its content, up to a limit (CSS caps it at the same height)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight ? `${Math.min(el.scrollHeight, 160)}px` : "";
  }, [input]);

  // Leaving the chat (New chat) cancels any answer still streaming
  useEffect(() => () => abortRef.current?.abort(), []);

  // Apply a change to the newest message (the assistant reply being streamed)
  const updateLast = (fn) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)));

  async function send(e) {
    e?.preventDefault();
    if (busy) {
      abortRef.current?.abort(); // the send button is a stop button while an answer is streaming
      return;
    }
    const question = input.trim();
    if (!question) return;

    // Earlier turns go to the backend as context; failed or empty replies are left out
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

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamChat(question, history, controller.signal)) {
        if (event.type === "sources") updateLast((m) => ({ ...m, sources: event.sources }));
        else if (event.type === "token") updateLast((m) => ({ ...m, content: m.content + event.text }));
        else if (event.type === "error") updateLast((m) => ({ ...m, error: event.message }));
      }
    } catch (err) {
      if (err.name === "AbortError") updateLast((m) => ({ ...m, stopped: true }));
      else updateLast((m) => ({ ...m, error: err.message }));
    } finally {
      updateLast((m) => ({ ...m, pending: false }));
      abortRef.current = null;
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!busy) send(e);
    }
  }

  return (
    <main className="view" hidden={hidden}>
      <div className="scroll">
        <div className="inner thread" aria-live="polite">
          {messages.length === 0 && <Empty info={info} offline={offline} />}
          {messages.map((m, i) => (
            <Message key={i} message={m} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="composer-wrap">
        <form className="composer" onSubmit={send}>
          <textarea
            ref={inputRef}
            rows={1}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask a question about your PDFs…"
            aria-label="Your question"
          />
          <button
            className={busy ? "send busy" : "send"}
            type="submit"
            disabled={offline || (!busy && !input.trim())}
            aria-label={busy ? "Stop answering" : "Send question"}
          >
            <svg className="i-send" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            <svg className="i-stop" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
}
