"""Task data access — every task query in the application lives here."""


from app.models import Task, TaskStatus
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    model = Task

    def list_for_workspace(
        self, workspace_id: int, status: TaskStatus | None = None
    ) -> list[Task]:
        query = self.db.query(Task).filter(Task.workspace_id == workspace_id)
        if status is not None:
            query = query.filter(Task.status == status)
        return list(query.order_by(Task.created_at.desc()).all())
