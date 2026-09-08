"""Task business logic.

Notice the shape every service method follows:
    1. authorize (membership check)
    2. load/validate
    3. mutate via repository
    4. commit

 Keeping that shape consistent is what makes a codebase reviewable — a
 reviewer can scan the 'authorize' line and immediately know it's enforced.
"""

from sqlalchemy.orm import Session

from app.models import Task, TaskStatus
from app.repositories.task_repo import TaskRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.errors import NotFoundError, PermissionDeniedError


class TaskService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.tasks = TaskRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def create(
        self, *, user_id: int, workspace_id: int, title: str, description: str
    ) -> Task:
        self._require_member(workspace_id, user_id)
        task = Task(
            title=title,
            description=description,
            workspace_id=workspace_id,
            created_by_id=user_id,
        )
        self.tasks.add(task)
        self.db.commit()
        return task

    def list_for_workspace(
        self, *, user_id: int, workspace_id: int, status: TaskStatus | None = None
    ) -> list[Task]:
        self._require_member(workspace_id, user_id)
        return self.tasks.list_for_workspace(workspace_id, status)

    def update(
        self,
        *,
        user_id: int,
        task_id: int,
        title: str | None = None,
        description: str | None = None,
        status: TaskStatus | None = None,
    ) -> Task:
        task = self.tasks.get(task_id)
        if task is None:
            raise NotFoundError("task_not_found")
        self._require_member(task.workspace_id, user_id)
        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if status is not None:
            task.status = status
        self.db.commit()
        return task

    def _require_member(self, workspace_id: int, user_id: int) -> None:
        if not self.workspaces.is_member(workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
