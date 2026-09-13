"""Calendar event endpoints.

Same thin-adapter shape as tasks.py: parse → service → map domain errors.
Deletion is direct (membership-checked in the service) — a documented,
deliberate contrast to task deletion, which is a governed action.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.errors import http_error_for
from app.db.session import get_db
from app.models import CalendarEvent, User
from app.schemas.event import EventCreate, EventOut, EventUpdate
from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["events"])

DOMAIN_ERRORS = (NotFoundError, PermissionDeniedError, BusinessRuleError)


@router.post("", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEvent:
    service = EventService(db)
    try:
        return service.create(
            user_id=current_user.id,
            workspace_id=payload.workspace_id,
            title=payload.title,
            description=payload.description,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.get("", response_model=list[EventOut])
def list_events(
    workspace_id: int,
    year: int = Query(..., ge=1, le=9999),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CalendarEvent]:
    service = EventService(db)
    try:
        return service.list_in_month(
            user_id=current_user.id,
            workspace_id=workspace_id,
            year=year,
            month=month,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.patch("/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CalendarEvent:
    service = EventService(db)
    try:
        return service.update(
            user_id=current_user.id,
            event_id=event_id,
            title=payload.title,
            description=payload.description,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = EventService(db)
    try:
        service.delete(user_id=current_user.id, event_id=event_id)
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None
