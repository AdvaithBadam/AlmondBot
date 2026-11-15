# AlmondBot

Ask questions about your own PDFs and get answers with page-level citations. Drop PDFs into `data/pdf/`, index them once, and chat in the browser.

**Privacy note:** PDF text is embedded and stored locally (sentence-transformers + ChromaDB), but the retrieved excerpts are sent to the [Groq](https://console.groq.com) API to write each answer. Don't use it for documents you can't send to a third party.

## Quickstart

You need Python 3.10+, Node 18+ and a free Groq API key.

```bash
# 1. Python deps (the first run also downloads the embedding model)
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# 2. API key
cp .env.example .env        # then paste your key after GROQ_API_KEY=

# 3. Add PDFs to data/pdf/ and build the index
python rag/scripts/ingest.py

# 4. Build the UI and start the app
cd frontend && npm install && npm run build && cd ..
uvicorn backend.app.main:app --port 8000
```

Open http://localhost:8000.

Added or changed PDFs? Run `ingest.py` again. Removed PDFs? Run `python rag/scripts/ingest.py --reset`.

**Development:** run the backend as above, then `cd frontend && npm run dev` and open http://localhost:5173 (it proxies `/api` to port 8000).

**Docker:** `docker build -t ragbot .` then
`docker run --rm -p 8000:8000 --env-file .env -v "$(pwd)/data:/app/data" ragbot` (indexes `data/pdf/` on start).

## How it works

```
ingest:  PDF -> pages -> ~1000-char chunks (stable IDs) -> embeddings -> ChromaDB
ask:     question -> embedding -> top-5 chunks -> drop chunks below MIN_SCORE
         -> prompt with numbered excerpts -> Groq LLM -> streamed answer + sources
```

If no chunk scores above `MIN_SCORE`, the LLM is not called and the bot says it found nothing relevant instead of guessing. Chunk IDs are hashes of file, page, position and text, so re-ingesting never creates duplicates.

## Tuning

Settings are in `rag/ragbot/config.py`. `MIN_SCORE` depends on your documents. Run a few on-topic and off-topic questions with

```bash
python rag/scripts/ask.py "your question" --show-context
```

which prints the raw similarity scores, and set `MIN_SCORE` between the two groups. Chunk size and overlap are in the same file; re-ingest with `--reset` after changing them.

## Limitations

- Scanned PDFs have no extractable text and are skipped (no OCR).
- Retrieval uses only your latest message, so a vague follow-up like "what about the second one?" may retrieve poorly.
- One shared index and no login: it's built for local, single-user use.
- PDFs with the same filename in different subfolders are treated as one source.

## Tests

```bash
cd rag && pytest
```

## Layout

```
data/pdf/        your PDFs            data/vector_store/   the index (gitignored)
rag/ragbot/      the RAG package      rag/scripts/         ingest.py, ask.py
backend/app/     FastAPI app          frontend/            React + Vite UI
```
