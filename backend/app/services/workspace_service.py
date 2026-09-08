"""Workspace business logic."""

from sqlalchemy.orm import Session

from app.models import Workspace
from app.repositories.workspace_repo import WorkspaceRepository


class WorkspaceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.workspaces = WorkspaceRepository(db)

    def list_for_user(self, user_id: int) -> list[Workspace]:
        return self.workspaces.list_for_user(user_id)
