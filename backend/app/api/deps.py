"""FastAPI dependency wiring.

Dependencies are the composition root of the backend: routers declare what
they need (a db session, the current user, an LLM provider) and this module
decides how to build it. Services stay constructor-injected and
framework-free.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core import security
from app.db.session import get_db
from app.integrations.base import LLMProvider
from app.integrations.factory import build_llm_provider
from app.models import User
from app.repositories.user_repo import UserRepository

# auto_error=False lets us raise our own consistent 401 shape
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate the request from the Bearer access token."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise unauthorized
    try:
        payload = security.decode_token(token)
    except jwt.InvalidTokenError:
        raise unauthorized from None
    if payload.get("type") != "access" or payload.get("sub") is None:
        raise unauthorized
    user = UserRepository(db).get(int(payload["sub"]))
    if user is None:
        raise unauthorized
    return user


def get_llm_provider() -> LLMProvider:
    """Provide the configured AI provider (mock in dev, OpenAI when set)."""
    return build_llm_provider()
