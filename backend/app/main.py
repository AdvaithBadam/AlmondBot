"""FastAPI app: one streaming chat endpoint, plus the built React app as static files.

Run from the repo root:  uvicorn backend.app.main:app --port 8000
"""
import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "rag"))  # makes the `ragbot` package importable

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from ragbot import RAGPipeline

from .schemas import ChatIn

logger = logging.getLogger("ragbot.api")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Build the pipeline ONCE and load the embedding model now, not on the first request
    pipeline = RAGPipeline()
    pipeline.retriever.embedder.model
    app.state.pipeline = pipeline
    if pipeline.retriever.vector_store.count() == 0:
        logger.warning("The index is empty. Put PDFs in data/pdf/ and run: python rag/scripts/ingest.py")
    yield


app = FastAPI(title="Ragbot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "chunks": app.state.pipeline.retriever.vector_store.count()}


@app.post("/api/chat/stream")
def chat_stream(body: ChatIn):
    """Server-sent events. Each event is `data: <json>` where json is one of
    {"type": "sources", ...}, {"type": "token", "text": ...}, {"type": "done"}, {"type": "error", ...}."""
    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is empty")
    history = [m.model_dump() for m in body.history]

    def events():
        try:
            for event in app.state.pipeline.stream(question, history):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as exc:  # the response has already started, so report it as an event
            logger.exception("Chat request failed")
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Serve the built frontend last, so the /api routes above take priority
DIST = REPO_ROOT / "frontend" / "dist"
if DIST.is_dir():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
else:
    @app.get("/")
    def frontend_missing():
        return {"message": "Frontend not built. Run `npm install && npm run build` in frontend/, "
                           "or use `npm run dev` and open http://localhost:5173."}
