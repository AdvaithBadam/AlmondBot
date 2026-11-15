import ReactMarkdown from "react-markdown";
import Sources from "./Sources";

const fixCitations = (text) => text.replace(/【\s*(\d+)\s*】/g, "[$1]");

export default function Message({ message }) {
  if (message.role === "user") {
    return (
      <div className="msg user">
        <p>{message.content}</p>
      </div>
    );
  }

  return (
    <div className="msg assistant">
      {message.content ? (
        <ReactMarkdown>{fixCitations(message.content)}</ReactMarkdown>
      ) : (
        message.pending && !message.error && <p className="muted">Searching your documents…</p>
      )}
      {message.error && <p className="error">{message.error}</p>}
      <Sources sources={message.sources} />
    </div>
  );
}
