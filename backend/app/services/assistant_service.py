"""Assistant business logic — build workspace context, ask the LLM provider.

The service depends on the ``LLMProvider`` *Protocol*, never on a concrete
SDK. That is dependency inversion: tests inject the deterministic mock and
production can inject any real provider — this file never changes when the
AI vendor changes.
"""

from sqlalchemy.orm import Session

from app.integrations.base import LLMProvider
from app.models import Task
from app.repositories.task_repo import TaskRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.errors import PermissionDeniedError


class AssistantService:
    def __init__(self, db: Session, provider: LLMProvider) -> None:
        self.db = db
        self.provider = provider
        self.tasks = TaskRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def ask(self, *, user_id: int, workspace_id: int, question: str) -> tuple[str, str]:
        """Return (answer, provider_name)."""
        if not self.workspaces.is_member(workspace_id, user_id):
            raise PermissionDeniedError("not_a_workspace_member")
        context = self._build_context(self.tasks.list_for_workspace(workspace_id))
        answer = self.provider.generate(question, context)
        return answer, self.provider.name

    @staticmethod
    def _build_context(tasks: list[Task]) -> str:
        """Bounded, local retrieval: task data IS the context.

        This is NexusAI's equivalent of ForgeFlow's "bounded lexical RAG" —
        deliberately small, deterministic, and privacy-safe: nothing leaves
        the process in mock mode.
        """
        if not tasks:
            return "The workspace has no tasks yet."
        lines = [
            f"- [{task.status.value}] {task.title}: {task.description or 'no description'}"
            for task in tasks
        ]
        return "Workspace tasks:\n" + "\n".join(lines)
