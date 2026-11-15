"""Pipeline tests with a fake retriever and a fake LLM: no models, no network."""
import pytest
from langchain_core.documents import Document

from ragbot import config
from ragbot.chunker import split_documents
from ragbot.pipeline import NO_ANSWER, RAGPipeline


def chunk(n=1, page=3, score=0.8):
    return {
        "content": f"excerpt number {n}",
        "metadata": {"source_file": "a.pdf", "page": page},
        "score": score,
    }


class FakeRetriever:
    def __init__(self, chunks):
        self.chunks = chunks

    def retrieve(self, query, top_k=5, min_score=0.0):
        return [c for c in self.chunks if c["score"] >= min_score][:top_k]


class Msg:
    def __init__(self, content):
        self.content = content


class FakeLLM:
    def __init__(self, reply="Yes 【1】 and 【2】."):
        self.reply = reply
        self.calls = []

    def invoke(self, messages):
        self.calls.append(messages)
        return Msg(self.reply)

    def stream(self, messages):
        self.calls.append(messages)
        for word in self.reply.split(" "):
            yield Msg(word + " ")


def test_nothing_relevant_refuses_without_calling_llm():
    llm = FakeLLM()
    pipe = RAGPipeline(retriever=FakeRetriever([chunk(score=0.01)]), llm=llm)
    result = pipe.query("anything")
    assert result["grounded"] is False
    assert result["answer"] == NO_ANSWER
    assert result["sources"] == []
    assert llm.calls == []


def test_answer_has_sources_and_fixed_citations():
    pipe = RAGPipeline(retriever=FakeRetriever([chunk(1, page=3, score=0.9), chunk(2, page=7, score=0.5)]),
                       llm=FakeLLM())
    result = pipe.query("question")
    assert result["grounded"] is True
    assert "[1]" in result["answer"] and "【" not in result["answer"]
    assert [s["n"] for s in result["sources"]] == [1, 2]
    assert result["sources"][0]["page"] == 3
    assert result["confidence"] == 0.9


def test_history_is_trimmed_and_ordered():
    llm = FakeLLM()
    pipe = RAGPipeline(retriever=FakeRetriever([chunk()]), llm=llm)
    history = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"} for i in range(20)]
    pipe.query("latest question", history=history)
    sent = llm.calls[0]
    assert len(sent) == 1 + config.MAX_HISTORY_MESSAGES + 1
    assert sent[0][0] == "system"
    assert "latest question" in sent[-1][1]


def test_stream_event_order():
    pipe = RAGPipeline(retriever=FakeRetriever([chunk()]), llm=FakeLLM("one two three"))
    events = list(pipe.stream("question"))
    assert events[0]["type"] == "sources" and events[0]["grounded"] is True
    assert events[-1] == {"type": "done"}
    assert "".join(e["text"] for e in events if e["type"] == "token").strip() == "one two three"


def test_stream_with_nothing_relevant():
    llm = FakeLLM()
    pipe = RAGPipeline(retriever=FakeRetriever([]), llm=llm)
    events = list(pipe.stream("question"))
    assert events[0]["grounded"] is False
    assert events[1]["text"] == NO_ANSWER
    assert llm.calls == []


def test_empty_question_is_rejected():
    pipe = RAGPipeline(retriever=FakeRetriever([chunk()]), llm=FakeLLM())
    with pytest.raises(ValueError):
        pipe.query("   ")
    with pytest.raises(ValueError):
        list(pipe.stream("   "))


def test_chunk_ids_are_stable_and_unique():
    pages = [Document(page_content="word " * 600, metadata={"source_file": "a.pdf", "page": 1})]
    first = [c.metadata["chunk_id"] for c in split_documents(pages)]
    second = [c.metadata["chunk_id"] for c in split_documents(pages)]
    assert len(first) > 1
    assert first == second
    assert len(set(first)) == len(first)
