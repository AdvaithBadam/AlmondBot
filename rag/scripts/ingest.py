"""Build (or refresh) the vector index from the PDFs in data/pdf/.

    python rag/scripts/ingest.py            # add or refresh every PDF in data/pdf/
    python rag/scripts/ingest.py --reset    # wipe the index first (use after deleting PDFs)
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # makes `ragbot` importable

from ragbot import config
from ragbot.chunker import split_documents
from ragbot.embeddings import EmbeddingManager
from ragbot.loader import load_all_pdfs
from ragbot.vector_store import VectorStore


def main() -> int:
    parser = argparse.ArgumentParser(description="Index the PDFs in data/pdf/")
    parser.add_argument("--reset", action="store_true",
                        help="delete the whole index before ingesting")
    parser.add_argument("--skip-errors", action="store_true",
                        help="log unreadable PDFs and continue instead of stopping")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    documents = load_all_pdfs(config.DATA_DIR, strict=not args.skip_errors)
    if not documents:
        print(f"No readable PDF pages found in {config.DATA_DIR}.\n"
              "Copy your PDFs there and run this again. (Scanned PDFs have no text and are skipped.)")
        return 1

    store = VectorStore()
    if args.reset:
        store.reset()

    chunks = split_documents(documents)

    if not args.reset:
        # Drop old chunks of each PDF first, so an edited PDF leaves nothing stale behind
        for source_file in sorted({c.metadata["source_file"] for c in chunks}):
            store.delete_source(source_file)

    embeddings = EmbeddingManager().embed_documents([c.page_content for c in chunks])
    store.upsert(chunks, embeddings)

    n_files = len({c.metadata["source_file"] for c in chunks})
    print(f"\nDone: {len(chunks)} chunks from {n_files} PDF(s). Index holds {store.count()} chunks.")
    return 0


if __name__ == "__main__":
    sys.exit(main())