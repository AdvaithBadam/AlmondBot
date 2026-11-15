from typing import List, Literal

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class ChatIn(BaseModel):
    question: str = Field(max_length=2000)
    history: List[Message] = Field(default_factory=list, max_length=40)
