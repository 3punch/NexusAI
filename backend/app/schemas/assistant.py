"""Assistant schemas."""

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    workspace_id: int


class AskResponse(BaseModel):
    answer: str
    provider: str
