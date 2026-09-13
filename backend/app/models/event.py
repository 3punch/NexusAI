"""CalendarEvent ORM model — workspace-scoped scheduling data.

Deliberate contrast with tasks: task deletion is a governed action
(integrity-critical), while events delete directly with a membership check —
low blast radius, and delete must stay frictionless for calendar editing.
Documented in docs/ARCHITECTURE_MAP.md.

Time convention: datetimes are stored as naive UTC (the SQLite-friendly
convention shared with every other timestamp in this schema). The API
boundary normalizes inputs to UTC and re-attaches UTC on output — see
``schemas/event.py``.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    workspace_id: Mapped[int] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
