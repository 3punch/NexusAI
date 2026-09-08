"""Governed action endpoints.

Notice there is NO delete-task endpoint. Deletion is deliberately hard to do:
it must be proposed as a governed action and approved by a second member.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.errors import http_error_for
from app.db.session import get_db
from app.models import GovernedAction, User
from app.schemas.action import ActionCreate, ActionOut
from app.services.action_service import ActionService
from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError

router = APIRouter(prefix="/actions", tags=["actions"])

DOMAIN_ERRORS = (NotFoundError, PermissionDeniedError, BusinessRuleError)


@router.post("", response_model=ActionOut, status_code=status.HTTP_201_CREATED)
def propose_action(
    payload: ActionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GovernedAction:
    service = ActionService(db)
    try:
        return service.propose(
            user_id=current_user.id,
            workspace_id=payload.workspace_id,
            kind=payload.kind,
            payload=payload.payload,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.get("", response_model=list[ActionOut])
def list_actions(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GovernedAction]:
    service = ActionService(db)
    try:
        return service.list_for_workspace(
            user_id=current_user.id, workspace_id=workspace_id
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.post("/{action_id}/approve", response_model=ActionOut)
def approve_action(
    action_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GovernedAction:
    service = ActionService(db)
    try:
        return service.approve(user_id=current_user.id, action_id=action_id)
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.post("/{action_id}/reject", response_model=ActionOut)
def reject_action(
    action_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GovernedAction:
    service = ActionService(db)
    try:
        return service.reject(user_id=current_user.id, action_id=action_id)
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None
