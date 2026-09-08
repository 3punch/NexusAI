"""Workspace data access + the membership checks every permission leans on."""


from app.models import Workspace, workspace_members
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    model = Workspace

    def is_member(self, workspace_id: int, user_id: int) -> bool:
        row = (
            self.db.query(workspace_members)
            .filter(
                workspace_members.c.workspace_id == workspace_id,
                workspace_members.c.user_id == user_id,
            )
            .first()
        )
        return row is not None

    def add_member(self, workspace_id: int, user_id: int) -> None:
        self.db.execute(
            workspace_members.insert().values(workspace_id=workspace_id, user_id=user_id)
        )

    def list_for_user(self, user_id: int) -> list[Workspace]:
        return (
            self.db.query(Workspace)
            .join(workspace_members, workspace_members.c.workspace_id == Workspace.id)
            .filter(workspace_members.c.user_id == user_id)
            .order_by(Workspace.created_at.asc())
            .all()
        )
