"""Authentication and registration business logic.

Services own the rules; routers only translate HTTP <-> service calls.
No FastAPI imports may appear in this module — ever.

Transaction rule: the service is the unit of work. Repositories flush but
never commit; the service commits once when the whole operation succeeded.
"""

from sqlalchemy.orm import Session

from app.core import security
from app.models import User, Workspace
from app.repositories.user_repo import UserRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.errors import BusinessRuleError


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.workspaces = WorkspaceRepository(db)

    def register(self, *, email: str, password: str, display_name: str) -> User:
        if self.users.get_by_email(email) is not None:
            raise BusinessRuleError("email_already_registered")
        user = User(
            email=email,
            hashed_password=security.hash_password(password),
            display_name=display_name,
        )
        self.users.add(user)
        # Every new user gets a personal workspace so the app is usable
        # immediately — tenancy exists from the first minute.
        workspace = Workspace(name=f"{display_name}'s workspace", owner_id=user.id)
        self.workspaces.add(workspace)
        self.workspaces.add_member(workspace.id, user.id)
        self.db.commit()
        return user

    def authenticate(self, *, email: str, password: str) -> User | None:
        user = self.users.get_by_email(email)
        if user is None or not security.verify_password(password, user.hashed_password):
            return None
        return user

    def issue_tokens(self, user: User) -> tuple[str, str]:
        """Return (access_token, refresh_token)."""
        return (
            security.create_access_token(str(user.id)),
            security.create_refresh_token(str(user.id)),
        )

    def user_from_refresh_token(self, refresh_token: str) -> User | None:
        try:
            payload = security.decode_token(refresh_token)
        except Exception:
            return None
        if payload.get("type") != "refresh":
            return None
        subject = payload.get("sub")
        if subject is None:
            return None
        return self.users.get(int(subject))
