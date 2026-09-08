"""Workspace discovery: registration auto-creates a personal workspace."""

from fastapi.testclient import TestClient

from conftest import auth_headers, register_and_login


def test_new_user_has_a_personal_workspace(client: TestClient) -> None:
    session = register_and_login(client)
    response = client.get(
        "/api/v1/workspaces", headers=auth_headers(session["token"])
    )
    assert response.status_code == 200
    workspaces = response.json()
    assert len(workspaces) == 1
    assert workspaces[0]["name"] == "Alice's workspace"
    assert workspaces[0]["owner_id"] == session["user_id"]


def test_workspaces_require_auth(client: TestClient) -> None:
    assert client.get("/api/v1/workspaces").status_code == 401
