"""Governed action business logic: propose -> approve/reject -> execute.

The rules worth internalizing:
- The proposer can never APPROVE their own action (two-person integrity).
- The proposer CAN reject (withdraw) their own action.
- Approval executes the side effect inside the same transaction, so the
  decision and its effect are atomic — no "approved but not executed" state.

This is NexusAI's real implementation of the pattern ForgeFlow-AI only
demonstrates with in-memory demo data.
"""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import ActionStatus, GovernedAction
from app.repositories.action_repo import ActionRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError

SUPPORTED_KINDS = {"delete_task"}


class ActionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.actions = ActionRepository(db)
        self.tasks = TaskRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def propose(
        self, *, user_id: int, workspace_id: int, kind: str, payload: dict
    ) -> GovernedAction:
        if not self.workspaces.is_member(workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
        if kind not in SUPPORTED_KINDS:
            raise BusinessRuleError("unsupported_action_kind")
        if kind == "delete_task":
            task = self.tasks.get(int(payload.get("task_id", 0)))
            if task is None or task.workspace_id != workspace_id:
                raise BusinessRuleError("task_not_in_workspace")
        action = GovernedAction(
            workspace_id=workspace_id,
            kind=kind,
            payload=payload,
            requested_by_id=user_id,
        )
        self.actions.add(action)
        self.db.commit()
        return action

    def list_for_workspace(
        self, *, user_id: int, workspace_id: int
    ) -> list[GovernedAction]:
        if not self.workspaces.is_member(workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
        return self.actions.list_for_workspace(workspace_id)

    def approve(self, *, user_id: int, action_id: int) -> GovernedAction:
        action = self._get_pending(action_id)
        if not self.workspaces.is_member(action.workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
        if action.requested_by_id == user_id:
            raise BusinessRuleError("proposer_cannot_approve")
        action.status = ActionStatus.approved
        action.decided_by_id = user_id
        action.decided_at = datetime.now(UTC)
        self._execute(action)
        self.db.commit()
        return action

    def reject(self, *, user_id: int, action_id: int) -> GovernedAction:
        action = self._get_pending(action_id)
        if not self.workspaces.is_member(action.workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
        action.status = ActionStatus.rejected
        action.decided_by_id = user_id
        action.decided_at = datetime.now(UTC)
        self.db.commit()
        return action

    def _get_pending(self, action_id: int) -> GovernedAction:
        action = self.actions.get(action_id)
        if action is None:
            raise NotFoundError("action_not_found")
        if action.status != ActionStatus.pending:
            raise BusinessRuleError("action_already_decided")
        return action

    def _execute(self, action: GovernedAction) -> None:
        """Perform the side effect of an approved action.

        New action kinds add a branch here AND to SUPPORTED_KINDS — the two
        places are intentionally adjacent so a reviewer never misses one.
        """
        if action.kind == "delete_task":
            task = self.tasks.get(int(action.payload["task_id"]))
            if task is not None:
                self.db.delete(task)
        action.status = ActionStatus.executed
