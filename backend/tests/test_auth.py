"""Auth flow: register -> login -> me -> refresh (with cookie rotation)."""

from fastapi.testclient import TestClient

from conftest import auth_headers, register_and_login


def test_register_login_me(client: TestClient) -> None:
    session = register_and_login(client)

    me = client.get("/api/v1/auth/me", headers=auth_headers(session["token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "alice@example.com"
    assert me.json()["display_name"] == "Alice"
    # Password hash must never leave the backend:
    assert "hashed_password" not in me.json()


def test_duplicate_registration_conflicts(client: TestClient) -> None:
    register_and_login(client)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alice@example.com",
            "password": "password123",
            "display_name": "Alice Again",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "email_already_registered"


def test_login_wrong_password(client: TestClient) -> None:
    register_and_login(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "alice@example.com", "password": "definitely-wrong"},
    )
    assert response.status_code == 401


def test_me_requires_token(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_refresh_returns_new_access_token(client: TestClient) -> None:
    register_and_login(client)  # login set the httpOnly refresh cookie
    refreshed = client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    new_token = refreshed.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers=auth_headers(new_token))
    assert me.status_code == 200


def test_refresh_without_cookie_fails(client: TestClient) -> None:
    assert client.post("/api/v1/auth/refresh").status_code == 401
