"""Calendar event business logic.

The service shape mirrors TaskService exactly:
    1. authorize (membership check)
    2. validate (effective start/end pair)
    3. mutate via repository
    4. commit

Deletion is direct (not a governed action) — a documented decision: events
are low-blast-radius scheduling data; governance stays reserved for
integrity-critical objects like tasks.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import CalendarEvent
from app.repositories.event_repo import EventRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError


class EventService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.events = EventRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def create(
        self,
        *,
        user_id: int,
        workspace_id: int,
        title: str,
        description: str,
        starts_at: datetime,
        ends_at: datetime | None,
    ) -> CalendarEvent:
        self._require_member(workspace_id, user_id)
        event = CalendarEvent(
            title=title,
            description=description,
            starts_at=self._as_utc_naive(starts_at),
            ends_at=self._as_utc_naive(ends_at) if ends_at is not None else None,
            workspace_id=workspace_id,
            created_by_id=user_id,
        )
        self.events.add(event)
        self.db.commit()
        return event

    def list_in_month(
        self, *, user_id: int, workspace_id: int, year: int, month: int
    ) -> list[CalendarEvent]:
        self._require_member(workspace_id, user_id)
        start = datetime(year, month, 1)
        end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)
        return self.events.list_for_range(workspace_id, start, end)

    def update(
        self,
        *,
        user_id: int,
        event_id: int,
        title: str | None = None,
        description: str | None = None,
        starts_at: datetime | None = None,
        ends_at: datetime | None = None,
    ) -> CalendarEvent:
        event = self.events.get(event_id)
        if event is None:
            raise NotFoundError("event_not_found")
        self._require_member(event.workspace_id, user_id)

        # Validate the EFFECTIVE pair (provided fields on top of stored ones)
        # before mutating — validate-first, like every other service method.
        new_starts = self._as_utc_naive(starts_at) if starts_at is not None else event.starts_at
        new_ends = self._as_utc_naive(ends_at) if ends_at is not None else event.ends_at
        if new_ends is not None and new_ends < new_starts:
            raise BusinessRuleError("ends_before_starts")

        if title is not None:
            event.title = title
        if description is not None:
            event.description = description
        event.starts_at = new_starts
        event.ends_at = new_ends
        self.db.commit()
        return event

    def delete(self, *, user_id: int, event_id: int) -> None:
        event = self.events.get(event_id)
        if event is None:
            raise NotFoundError("event_not_found")
        self._require_member(event.workspace_id, user_id)
        self.db.delete(event)
        self.db.commit()

    def _require_member(self, workspace_id: int, user_id: int) -> None:
        if not self.workspaces.is_member(workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")

    @staticmethod
    def _as_utc_naive(value: datetime) -> datetime:
        """Flatten UTC-aware input to naive UTC for storage."""
        if value.tzinfo is None:
            return value
        return value.astimezone(UTC).replace(tzinfo=None)
