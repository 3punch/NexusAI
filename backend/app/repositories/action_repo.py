"""GovernedAction data access — the audit ledger's queries."""


from app.models import ActionStatus, GovernedAction
from app.repositories.base import BaseRepository


class ActionRepository(BaseRepository[GovernedAction]):
    model = GovernedAction

    def list_for_workspace(
        self, workspace_id: int, status: ActionStatus | None = None
    ) -> list[GovernedAction]:
        query = self.db.query(GovernedAction).filter(
            GovernedAction.workspace_id == workspace_id
        )
        if status is not None:
            query = query.filter(GovernedAction.status == status)
        return list(query.order_by(GovernedAction.created_at.desc()).all())
