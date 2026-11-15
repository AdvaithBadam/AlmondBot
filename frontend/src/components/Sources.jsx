export default function Sources({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="sources">
      {sources.map((s) => (
        <details key={s.n}>
          <summary>
            <span className="n">[{s.n}]</span>
            <span>
              {s.source_file}, page {s.page}
            </span>
            <span className="score" title="Cosine similarity to your question">
              {s.score.toFixed(2)}
            </span>
          </summary>
          <p>{s.preview}</p>
        </details>
      ))}
    </div>
  );
}
