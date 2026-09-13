"""Aggregates every v1 router.

Adding a new domain = one import + one include_router line. Versioning lives
in the URL (``/api/v1/...``) so breaking changes get a v2 namespace instead
of silently breaking clients.
"""

from fastapi import APIRouter

from app.api.v1 import actions, assistant, auth, events, tasks, workspaces

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(tasks.router)
api_router.include_router(actions.router)
api_router.include_router(assistant.router)
api_router.include_router(events.router)
