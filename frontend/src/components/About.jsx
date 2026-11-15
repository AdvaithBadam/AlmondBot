export default function About({ hidden, info }) {
  const embedding = info?.embedding_model;
  const llm = info?.llm_model;

  const stack = [
    ["pypdf", "Reads the text of each PDF page."],
    ["sentence-transformers", `${embedding ? `${embedding} turns` : "Turns"} text into vectors. Runs on this computer.`],
    ["ChromaDB", "Stores the vectors on disk and finds the passages closest to a question."],
    ["Groq", `${llm ? `${llm} writes` : "A hosted LLM writes"} the answer from those passages. This is the only cloud step.`],
    ["FastAPI", "Serves the API and streams the answer as it is written."],
    ["React and Vite", "This interface."],
  ];

  return (
    <main className="view" hidden={hidden}>
      <div className="scroll">
        <div className="inner about">
          <h2>About AlmondBot</h2>
          <p className="lede">
            AlmondBot answers questions from the PDFs you give it, and shows the page each answer came from.
          </p>

          <h3>How it works</h3>
          <ol>
            <li>Each PDF is split into overlapping chunks and turned into vectors.</li>
            <li>Your question is turned into a vector and matched against the chunks.</li>
            <li>If no chunk is close enough, AlmondBot says so instead of guessing.</li>
            <li>Otherwise the best chunks go to the LLM, which answers and cites them as [1], [2] and so on.</li>
          </ol>

          <h3>Built with</h3>
          <dl>
            {stack.map(([name, text]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>

          <h3>Privacy</h3>
          <p>
            Embedding and storage happen locally. To write an answer, the retrieved excerpts and your recent
            messages are sent to Groq, so avoid documents you can't share with a third party.
          </p>
        </div>
      </div>
    </main>
  );
}
