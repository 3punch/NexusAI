"""Governed actions: propose -> approve (by a SECOND member) -> task deleted.

These tests document the governance rules in executable form:
- the proposer cannot approve their own action (409)
- a second member approving executes the deletion atomically
- rejecting leaves the world unchanged
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Workspace, workspace_members
from conftest import auth_headers, register_and_login


def _workspace_id(db: Session, owner_id: int) -> int:
    return db.query(Workspace).filter(Workspace.owner_id == owner_id).one().id


def _add_member(db: Session, workspace_id: int, user_id: int) -> None:
    db.execute(
        workspace_members.insert().values(
            workspace_id=workspace_id, user_id=user_id
        )
    )
    db.commit()


def _create_task(client: TestClient, token: str, workspace_id: int) -> int:
    created = client.post(
        "/api/v1/tasks",
        json={"workspace_id": workspace_id, "title": "Dangerous task"},
        headers=auth_headers(token),
    )
    assert created.status_code == 201
    return created.json()["id"]


def test_propose_delete_action_is_pending(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    task_id = _create_task(client, session["token"], workspace_id)

    proposed = client.post(
        "/api/v1/actions",
        json={"workspace_id": workspace_id, "kind": "delete_task", "payload": {"task_id": task_id}},
        headers=auth_headers(session["token"]),
    )
    assert proposed.status_code == 201, proposed.text
    assert proposed.json()["status"] == "pending"


def test_proposer_cannot_approve_own_action(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    task_id = _create_task(client, session["token"], workspace_id)
    proposed = client.post(
        "/api/v1/actions",
        json={"workspace_id": workspace_id, "kind": "delete_task", "payload": {"task_id": task_id}},
        headers=auth_headers(session["token"]),
    )

    decided = client.post(
        f"/api/v1/actions/{proposed.json()['id']}/approve",
        headers=auth_headers(session["token"]),
    )
    assert decided.status_code == 409
    assert decided.json()["detail"] == "proposer_cannot_approve"


def test_approval_executes_deletion(
    client: TestClient, db_session: Session
) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    workspace_id = _workspace_id(db_session, alice["user_id"])
    _add_member(db_session, workspace_id, bob["user_id"])
    task_id = _create_task(client, alice["token"], workspace_id)

    proposed = client.post(
        "/api/v1/actions",
        json={"workspace_id": workspace_id, "kind": "delete_task", "payload": {"task_id": task_id}},
        headers=auth_headers(alice["token"]),
    )
    action_id = proposed.json()["id"]

    approved = client.post(
        f"/api/v1/actions/{action_id}/approve",
        headers=auth_headers(bob["token"]),
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "executed"

    remaining = client.get(
        "/api/v1/tasks",
        params={"workspace_id": workspace_id},
        headers=auth_headers(alice["token"]),
    )
    assert remaining.json() == []


def test_rejection_leaves_task_in_place(
    client: TestClient, db_session: Session
) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    workspace_id = _workspace_id(db_session, alice["user_id"])
    _add_member(db_session, workspace_id, bob["user_id"])
    task_id = _create_task(client, alice["token"], workspace_id)

    proposed = client.post(
        "/api/v1/actions",
        json={"workspace_id": workspace_id, "kind": "delete_task", "payload": {"task_id": task_id}},
        headers=auth_headers(alice["token"]),
    )
    action_id = proposed.json()["id"]

    rejected = client.post(
        f"/api/v1/actions/{action_id}/reject",
        headers=auth_headers(bob["token"]),
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    remaining = client.get(
        "/api/v1/tasks",
        params={"workspace_id": workspace_id},
        headers=auth_headers(alice["token"]),
    )
    assert len(remaining.json()) == 1
