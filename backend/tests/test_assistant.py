"""Assistant flow: asks require membership and go through the mock provider."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Workspace
from conftest import auth_headers, register_and_login


def _workspace_id(db: Session, owner_id: int) -> int:
    return db.query(Workspace).filter(Workspace.owner_id == owner_id).one().id


def test_ask_returns_deterministic_mock_answer(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    client.post(
        "/api/v1/tasks",
        json={"workspace_id": workspace_id, "title": "Prepare demo"},
        headers=auth_headers(session["token"]),
    )

    response = client.post(
        "/api/v1/assistant/ask",
        json={"workspace_id": workspace_id, "question": "What is on my plate?"},
        headers=auth_headers(session["token"]),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["provider"] == "mock"
    assert "What is on my plate?" in body["answer"]
    assert "1 task(s)" in body["answer"]


def test_ask_requires_membership(client: TestClient, db_session: Session) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    workspace_id = _workspace_id(db_session, alice["user_id"])

    response = client.post(
        "/api/v1/assistant/ask",
        json={"workspace_id": workspace_id, "question": "Tell me Alice's secrets"},
        headers=auth_headers(bob["token"]),
    )
    assert response.status_code == 403


def test_ask_requires_auth(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    response = client.post(
        "/api/v1/assistant/ask",
        json={"workspace_id": workspace_id, "question": "Anonymous hello"},
    )
    assert response.status_code == 401
