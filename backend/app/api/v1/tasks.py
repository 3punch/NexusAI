"""Task endpoints."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.errors import http_error_for
from app.db.session import get_db
from app.models import Task, TaskStatus, User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate
from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])

DOMAIN_ERRORS = (NotFoundError, PermissionDeniedError, BusinessRuleError)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    service = TaskService(db)
    try:
        return service.create(
            user_id=current_user.id,
            workspace_id=payload.workspace_id,
            title=payload.title,
            description=payload.description,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.get("", response_model=list[TaskOut])
def list_tasks(
    workspace_id: int,
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Task]:
    service = TaskService(db)
    try:
        return service.list_for_workspace(
            user_id=current_user.id,
            workspace_id=workspace_id,
            status=status_filter,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    service = TaskService(db)
    try:
        return service.update(
            user_id=current_user.id,
            task_id=task_id,
            title=payload.title,
            description=payload.description,
            status=payload.status,
        )
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None
