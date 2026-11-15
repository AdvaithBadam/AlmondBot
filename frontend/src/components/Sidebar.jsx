import almond from "../assets/almond.png";
import ThemeToggle from "./ThemeToggle";

function Icon({ children, strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Sidebar({ view, onNav, onNew, info, offline }) {
  const docs = info?.documents ?? [];
  let state = "loading";
  let status = "Checking…";
  if (offline) {
    state = "off";
    status = "Backend offline";
  } else if (info) {
    state = docs.length ? "ready" : "empty";
    status = docs.length ? `Ready · ${info.chunks} chunks` : "Nothing indexed";
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="logo" src={almond} alt="" />
        <div>
          <h1>AlmondBot</h1>
          <p>Chat with your PDFs</p>
        </div>
        <ThemeToggle />
      </div>

      <details className="library">
        <summary>
          <span className="lib-text">
            <strong>{info ? `${docs.length} PDF${docs.length === 1 ? "" : "s"} indexed` : "Library"}</strong>
            <span className="lib-status">
              <i className={`dot ${state}`} />
              {status}
            </span>
          </span>
          <span className="chev" aria-hidden="true">›</span>
        </summary>
        {docs.length > 0 && (
          <ul className="files">
            {docs.map((d) => (
              <li key={d.name}>
                <span className="fname" title={d.name}>{d.name}</span>
                <span className="fmeta">{d.pages ? `${d.pages} pp` : `${d.chunks} chunks`}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">Add or remove PDFs in <code>data/pdf/</code>, then run <code>ingest.py</code>.</p>
      </details>

      <nav className="nav">
        <button type="button" className="new" onClick={onNew}>
          <Icon strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
          New chat
        </button>
        <button type="button" aria-current={view === "chat" ? "page" : undefined} onClick={() => onNav("chat")}>
          <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Icon>
          Chat
        </button>
        <button type="button" aria-current={view === "about" ? "page" : undefined} onClick={() => onNav("about")}>
          <Icon><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Icon>
          About
        </button>
      </nav>

      <p className="privacy">
        Your PDFs and the index stay on this computer. Only the excerpts relevant to a question are sent
        to Groq to write the answer.{" "}
        <button type="button" className="link" onClick={() => onNav("about")}>How it works</button>
      </p>
    </aside>
  );
}
