"""Ask a question from the terminal.

    python rag/scripts/ask.py "What does the document say about X?"
    python rag/scripts/ask.py "..." --show-context     # also print raw retrieval scores

--show-context ignores MIN_SCORE and prints the top chunks with their scores. Use it to
tune MIN_SCORE in config.py: ask a few on-topic and a few off-topic questions and pick a
value between the two groups of scores.
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ragbot import RAGPipeline, config


def main() -> int:
    parser = argparse.ArgumentParser(description="Ask the RAG pipeline a question")
    parser.add_argument("question")
    parser.add_argument("--top-k", type=int, default=config.TOP_K)
    parser.add_argument("--min-score", type=float, default=config.MIN_SCORE)
    parser.add_argument("--show-context", action="store_true",
                        help="print retrieved chunks and scores, ignoring MIN_SCORE")
    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING)
    pipeline = RAGPipeline()

    if args.show_context:
        hits = pipeline.retriever.retrieve(args.question, top_k=args.top_k, min_score=-1.0)
        print(f"--- Top {len(hits)} chunks (MIN_SCORE is {config.MIN_SCORE}) ---")
        for rank, hit in enumerate(hits, start=1):
            meta = hit["metadata"]
            preview = hit["content"][:200].replace("\n", " ")
            print(f"{rank}. score={hit['score']:.3f}  {meta['source_file']} p.{meta['page']}\n   {preview}...")
        print("--- Answer ---")

    sources = []
    for event in pipeline.stream(args.question, top_k=args.top_k, min_score=args.min_score):
        if event["type"] == "sources":
            sources = event["sources"]
        elif event["type"] == "token":
            print(event["text"], end="", flush=True)
    print()

    if sources:
        print("\nSources:")
        for s in sources:
            print(f"  [{s['n']}] {s['source_file']}, page {s['page']} (score {s['score']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
