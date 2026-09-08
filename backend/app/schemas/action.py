"""Governed action schemas.

``kind`` is constrained by regex so unsupported action types are rejected at
the validation boundary, before any service code runs.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.action import ActionStatus


class ActionCreate(BaseModel):
    workspace_id: int
    kind: str = Field(pattern="^(delete_task)$")
    payload: dict[str, Any] = Field(default_factory=dict)


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    kind: str
    payload: dict[str, Any]
    status: ActionStatus
    requested_by_id: int
    decided_by_id: int | None
    created_at: datetime
    decided_at: datetime | None
