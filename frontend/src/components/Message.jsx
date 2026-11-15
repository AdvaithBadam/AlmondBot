import { useState } from "react";
import ReactMarkdown from "react-markdown";
import Sources from "./Sources";

// gpt-oss sometimes writes citations as 【1】. Fixed here, on the full text, because a bracket
// can be split across two streamed tokens.
const fixCitations = (text) => text.replace(/【\s*(\d+)\s*】/g, "[$1]");

// Turn "[2]" in rendered text into a small button that opens source 2
function withCites(children, onCite) {
  const out = [];
  [].concat(children).forEach((child, i) => {
    if (typeof child !== "string") {
      out.push(child);
      return;
    }
    child.split(/(\[\d+\])/).forEach((piece, j) => {
      const m = piece.match(/^\[(\d+)\]$/);
      out.push(
        m ? (
          <button key={`${i}-${j}`} type="button" className="cite" onClick={() => onCite(Number(m[1]))}
                  aria-label={`Show source ${m[1]}`}>
            {m[1]}
          </button>
        ) : (
          piece
        )
      );
    });
  });
  return out;
}

export default function Message({ message }) {
  const [openN, setOpenN] = useState(null);

  if (message.role === "user") {
    return (
      <div className="msg user">
        <p>{message.content}</p>
      </div>
    );
  }

  const components = {
    p: ({ children }) => <p>{withCites(children, setOpenN)}</p>,
    li: ({ children }) => <li>{withCites(children, setOpenN)}</li>,
  };

  let body = null;
  if (message.content) {
    body = <ReactMarkdown components={components}>{fixCitations(message.content)}</ReactMarkdown>;
  } else if (message.pending && !message.error) {
    body = <p className="muted">Searching your documents…</p>;
  } else if (message.stopped) {
    body = <p className="muted">Stopped.</p>;
  }

  return (
    <div className="msg assistant">
      <div className="who">AlmondBot</div>
      <div className="card">
        {body}
        {message.error && <p className="error">{message.error}</p>}
        <Sources sources={message.sources} openN={openN} setOpenN={setOpenN} />
      </div>
    </div>
  );
}
