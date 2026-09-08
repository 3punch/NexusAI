"""GovernedAction ORM model — the propose -> approve/reject -> execute ledger.

Destructive or sensitive operations never execute directly; they are recorded
here first and executed only after an approval. This is the pattern ForgeFlow
demonstrates and NexusAI implements for real, backed by the database.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ActionStatus(StrEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    executed = "executed"


class GovernedAction(Base):
    __tablename__ = "governed_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(50))  # e.g. "delete_task"
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[ActionStatus] = mapped_column(
        Enum(ActionStatus, native_enum=False), default=ActionStatus.pending
    )
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
