"""Security primitives: password hashing and JWT creation/validation.

This module is the ONLY place that knows *how* passwords are hashed or how
tokens are signed. Services call these functions, so swapping an algorithm
later is a one-file change — the essence of the dependency rule.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _create_token(subject: str, token_type: str, lifetime: timedelta) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + lifetime).timestamp()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def create_access_token(subject: str) -> str:
    settings = get_settings()
    return _create_token(subject, "access", timedelta(minutes=settings.access_token_expire_minutes))


def create_refresh_token(subject: str) -> str:
    settings = get_settings()
    return _create_token(subject, "refresh", timedelta(days=settings.refresh_token_expire_days))


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT.

    Raises ``jwt.ExpiredSignatureError`` / ``jwt.InvalidTokenError`` on
    invalid tokens — callers translate those into HTTP 401.
    """
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
