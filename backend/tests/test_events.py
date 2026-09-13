"""Calendar event flow: create, month-filtered list, update, delete.

Mirrors test_tasks.py conventions: Alice owns the personal workspace, Bob is
the outsider whose requests must fail with 403. Also covers the month
boundary (an event on Oct 1 must not appear in September's list) and the
end-before-start business rule at both the schema (422) and service (409)
layers.
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


def _create_event(
    client: TestClient,
    token: str,
    workspace_id: int,
    title: str = "Standup",
    starts_at: str = "2026-09-15T09:00:00Z",
    ends_at: str | None = "2026-09-15T09:30:00Z",
) -> dict:
    response = client.post(
        "/api/v1/events",
        json={
            "workspace_id": workspace_id,
            "title": title,
            "description": "",
            "starts_at": starts_at,
            "ends_at": ends_at,
        },
        headers=auth_headers(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_list_month(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])

    _create_event(
        client,
        session["token"],
        workspace_id,
        title="Later",
        starts_at="2026-09-20T10:00:00Z",
        ends_at=None,
    )
    _create_event(
        client,
        session["token"],
        workspace_id,
        title="Earlier",
        starts_at="2026-09-05T08:00:00Z",
        ends_at=None,
    )

    listed = client.get(
        "/api/v1/events",
        params={"workspace_id": workspace_id, "year": 2026, "month": 9},
        headers=auth_headers(session["token"]),
    )
    assert listed.status_code == 200
    events = listed.json()
    assert [event["title"] for event in events] == ["Earlier", "Later"]
    assert events[0]["starts_at"].startswith("2026-09-05")


def test_month_filter_excludes_adjacent_months(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    _create_event(
        client,
        session["token"],
        workspace_id,
        title="In september",
        starts_at="2026-09-30T23:00:00Z",
        ends_at=None,
    )
    _create_event(
        client,
        session["token"],
        workspace_id,
        title="In october",
        starts_at="2026-10-01T00:30:00Z",
        ends_at=None,
    )

    listed = client.get(
        "/api/v1/events",
        params={"workspace_id": workspace_id, "year": 2026, "month": 9},
        headers=auth_headers(session["token"]),
    )
    assert [event["title"] for event in listed.json()] == ["In september"]


def test_create_event_requires_auth(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    response = client.post(
        "/api/v1/events",
        json={
            "workspace_id": workspace_id,
            "title": "Sneaky",
            "starts_at": "2026-09-15T09:00:00Z",
        },
    )
    assert response.status_code == 401



def test_outsider_cannot_create_event(client: TestClient, db_session: Session) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    alice_workspace = _workspace_id(db_session, alice["user_id"])

    response = client.post(
        "/api/v1/events",
        json={
            "workspace_id": alice_workspace,
            "title": "Bob's intrusion",
            "starts_at": "2026-09-15T09:00:00Z",
        },
        headers=auth_headers(bob["token"]),
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "not_a_workspace_member"


def test_end_before_start_rejected_on_create(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    response = client.post(
        "/api/v1/events",
        json={
            "workspace_id": workspace_id,
            "title": "Time travel",
            "starts_at": "2026-09-15T10:00:00Z",
            "ends_at": "2026-09-15T09:00:00Z",
        },
        headers=auth_headers(session["token"]),
    )
    assert response.status_code == 422


def test_update_event(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    # ends_at=None: no end constraint, so a free start move is unambiguous —
    # moving a start PAST a set end is a 409 by design (see the conflict test).
    event = _create_event(client, session["token"], workspace_id, ends_at=None)

    updated = client.patch(
        f"/api/v1/events/{event['id']}",
        json={"title": "Renamed", "starts_at": "2026-09-16T11:00:00Z"},
        headers=auth_headers(session["token"]),
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Renamed"
    assert updated.json()["starts_at"].startswith("2026-09-16")


def test_update_that_puts_end_before_start_conflicts(
    client: TestClient, db_session: Session
) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    event = _create_event(
        client,
        session["token"],
        workspace_id,
        starts_at="2026-09-15T10:00:00Z",
        ends_at="2026-09-15T11:00:00Z",
    )

    moved = client.patch(
        f"/api/v1/events/{event['id']}",
        json={"starts_at": "2026-09-15T12:00:00Z"},
        headers=auth_headers(session["token"]),
    )
    assert moved.status_code == 409
    assert moved.json()["detail"] == "ends_before_starts"


def test_delete_event(client: TestClient, db_session: Session) -> None:
    session = register_and_login(client)
    workspace_id = _workspace_id(db_session, session["user_id"])
    event = _create_event(client, session["token"], workspace_id)

    deleted = client.delete(
        f"/api/v1/events/{event['id']}", headers=auth_headers(session["token"])
    )
    assert deleted.status_code == 204

    listed = client.get(
        "/api/v1/events",
        params={"workspace_id": workspace_id, "year": 2026, "month": 9},
        headers=auth_headers(session["token"]),
    )
    assert listed.json() == []

    again = client.delete(
        f"/api/v1/events/{event['id']}", headers=auth_headers(session["token"])
    )
    assert again.status_code == 404


def test_outsider_cannot_delete_event(client: TestClient, db_session: Session) -> None:
    alice = register_and_login(client)
    bob = register_and_login(client, email="bob@example.com", display_name="Bob")
    alice_workspace = _workspace_id(db_session, alice["user_id"])
    event = _create_event(client, alice["token"], alice_workspace)

    deleted = client.delete(
        f"/api/v1/events/{event['id']}", headers=auth_headers(bob["token"])
    )
    assert deleted.status_code == 403

