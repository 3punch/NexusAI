"""Task flow: create, list, update — plus the permission checks that matter.

Note how tenancy is tested: a second user (Bob) is NOT a member of Alice's
personal workspace, so any attempt by Bob to touch it must fail with 403.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Workspace
from conftest import auth_headers, register_and_login


def _workspace_id(db: Session, owner_id: int) -> int:
    """Every user gets a personal workspace at registration."""
    return (
        db.query(Workspace).filter(Workspace.owner_id == owner_id).one().id
    )


def test_create_and_list_tasks(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])

    created = client.post(
        "/api/v1/tasks",
        json={
            "workspace_id": workspace_id,
            "title": "Write architecture docs",
            "description": "Map every layer",
        },
        headers=auth_headers(session["token"]),
    )
    assert created.status_code == 201, created.text
    assert created.json()["status"] == "todo"

    listed = client.get(
        "/api/v1/tasks",
        params={"workspace_id": workspace_id},
        headers=auth_headers(session["token"]),
    )
    assert listed.status_code == 200
    assert [task["title"] for task in listed.json()] == ["Write architecture docs"]


def test_create_task_requires_auth(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    response = client.post(
        "/api/v1/tasks",
        json={"workspace_id": workspace_id, "title": "Sneaky task"},
    )
    assert response.status_code == 401


def test_outsider_cannot_create_task(client: TestClient, db_session: Session) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    alice_workspace = _workspace_id(db_session, alice["user_id"])

    response = client.post(
        "/api/v1/tasks",
        json={"workspace_id": alice_workspace, "title": "Bob's intrusion"},
        headers=auth_headers(bob["token"]),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "not_a_workspace_member"


def test_update_task_status(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    created = client.post(
        "/api/v1/tasks",
        json={"workspace_id": workspace_id, "title": "Finish setup"},
        headers=auth_headers(session["token"]),
    )
    task_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"status": "done"},
        headers=auth_headers(session["token"]),
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "done"
