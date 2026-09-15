# Deployed-entrypoint simulation: loads api/index.py with the SAME
# environment the Vercel deployment sets, then exercises the REAL app
# (health, register, login, tasks, events, chess file, notebooks-disabled
# gate) through FastAPI's TestClient.
#
# Run from the repo root:
#   backend\.venv\Scripts\python.exe scripts\simulate_deployed_api.py
"""Simulate the Vercel serverless API entrypoint locally."""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
# Windows has no /tmp (Vercel's Linux does) — the simulation DB lives in the
# OS temp dir. The deployed default stays sqlite:////tmp/nexusai.db.
import tempfile

SIM_DB = Path(tempfile.gettempdir()) / "nexusai-sim.db"
SIM_DB_URL = "sqlite:///" + SIM_DB.as_posix()

os.environ["NEXUSAI_DATABASE_URL"] = SIM_DB_URL
os.environ["NEXUSAI_ENABLE_NOTEBOOKS"] = "false"
os.environ["NEXUSAI_ENVIRONMENT"] = "production"

sys.path.insert(0, str(BACKEND_DIR))

try:
    SIM_DB.unlink()
except OSError:
    pass

import importlib.util

spec = importlib.util.spec_from_file_location("deployed_api", ROOT / "api" / "index.py")
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
app = module.app

from fastapi.testclient import TestClient

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


client = TestClient(app)

health = client.get("/health")
check("health 200", health.status_code == 200, health.text)
check(
    "health production env",
    health.json().get("environment") == "production",
    health.text,
)

reg = client.post(
    "/api/v1/auth/register",
    json={"email": "deploy@example.com", "password": "password123", "display_name": "Deploy"},
)
check("register 201", reg.status_code == 201, reg.text)

login = client.post(
    "/api/v1/auth/login",
    json={"email": "deploy@example.com", "password": "password123"},
)
check("login 200", login.status_code == 200, login.text)
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

me = client.get("/api/v1/auth/me", headers=headers)
check("me 200", me.status_code == 200, me.text)

workspaces = client.get("/api/v1/workspaces", headers=headers)
check("workspaces list 200", workspaces.status_code == 200, workspaces.text)
ws_id = workspaces.json()[0]["id"]

task = client.post(
    "/api/v1/tasks",
    headers=headers,
    json={"workspace_id": ws_id, "title": "Deployed smoke task"},
)
check("create task 201", task.status_code == 201, task.text)

event = client.post(
    "/api/v1/events",
    headers=headers,
    json={
        "workspace_id": ws_id,
        "title": "Deployed smoke event",
        "starts_at": "2026-09-20T10:00:00Z",
    },
)
check("create event 201", event.status_code == 201, event.text)

run_nb = client.post(
    "/api/v1/notebooks/run",
    headers=headers,
    json={"file_name": "GradientDescent.ipynb"},
)
check(
    "notebooks disabled gate 409",
    run_nb.status_code == 409 and run_nb.json().get("detail") == "notebooks_disabled",
    run_nb.text,
)

docs = client.get("/docs")
check("docs served", docs.status_code == 200, str(docs.status_code))

if failures:
    print(f"\n{len(failures)} check(s) FAILED: {failures}")
    raise SystemExit(1)
print("\nAll deployed-entrypoint checks passed.")
