"""Calendar event data access — every event query lives here.

``list_for_range`` is half-open (``starts_at >= start AND starts_at < end``)
so month boundaries compose without off-by-one days.
"""

from datetime import datetime

from app.models import CalendarEvent
from app.repositories.base import BaseRepository


class EventRepository(BaseRepository[CalendarEvent]):
    model = CalendarEvent

    def list_for_range(
        self, workspace_id: int, start: datetime, end: datetime
    ) -> list[CalendarEvent]:
        return list(
            self.db.query(CalendarEvent)
            .filter(
                CalendarEvent.workspace_id == workspace_id,
                CalendarEvent.starts_at >= start,
                CalendarEvent.starts_at < end,
            )
            .order_by(CalendarEvent.starts_at.asc())
            .all()
        )
