"""Shared test fixtures.

The app is created with ``create_app()`` and ONLY ``get_db`` is overridden —
so tests exercise the exact same dependency chain production uses. In-memory
SQLite with ``StaticPool`` keeps every connection on the same schema.

Testing lesson: never re-implement wiring in tests. Override the smallest
possible seam (here: the DB) and let everything else be real.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_app


@pytest.fixture()
def db_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(db_engine) -> Session:
    TestingSession = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture()
def client(db_engine) -> TestClient:
    TestingSession = sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def register_and_login(
    client: TestClient,
    email: str = "alice@example.com",
    password: str = "password123",
    display_name: str = "Alice",
) -> dict:
    """Convenience: register, login, return {'token', 'user_id', 'email'}."""
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "display_name": display_name},
    )
    assert registered.status_code == 201, registered.text
    logged_in = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert logged_in.status_code == 200, logged_in.text
    token = logged_in.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    return {"token": token, "user_id": me.json()["id"], "email": email}


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
