export default function Sources({ sources, openN, setOpenN }) {
    if (!sources?.length) return null;

    return (
        <div className="sources">
            {sources.map((s) => (
                <details
                    key={s.n}
                    open={openN === s.n}
                    onToggle={(e) => {
                        const isOpen = e.currentTarget.open;
                        // Only clear the selection if it is still this source (another one may have just opened)
                        setOpenN((prev) => (isOpen ? s.n : prev === s.n ? null : prev));
                    }}
                >
                    <summary>
                        <span className="n">{s.n}</span>
                        <span className="file" title={s.source_file}>{s.source_file}</span>
                        <span className="page">page {s.page}</span>
                        <span className="score" title="Cosine similarity to your question">{s.score.toFixed(2)}</span>
                    </summary>
                    <p className="preview"><mark>{s.preview}</mark></p>
                </details>
            ))}
        </div>
    );
}
