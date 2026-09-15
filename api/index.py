"""Vercel serverless entrypoint for the NexusAI API.

Wraps the FastAPI app from ``backend/app`` for Vercel's Python runtime
(``vercel.json`` rewrites ``/api/*``, ``/health`` and ``/docs`` here).

Platform realities encoded below:
- ``/tmp`` is the only writable path on serverless, so the SQLite database
  lives there. The filesystem is EPHEMERAL per instance: data resets on
  cold starts and redeploys — this deployment is a demo surface. For
  persistent data, point ``NEXUSAI_DATABASE_URL`` at hosted PostgreSQL.
- Notebook execution is DISABLED here (the ML/Jupyter stack does not fit a
  serverless bundle); it remains fully available when running locally.
- Override any of these with real environment variables in the Vercel
  dashboard (``NEXUSAI_SECRET_KEY`` is recommended for auth tokens).
"""

import os
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
BACKEND_DIR = API_DIR.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("NEXUSAI_DATABASE_URL", "sqlite:////tmp/nexusai.db")
os.environ.setdefault("NEXUSAI_ENABLE_NOTEBOOKS", "false")
os.environ.setdefault("NEXUSAI_ENVIRONMENT", "production")

import app.models  # noqa: E402,F401  — registers every model on Base.metadata
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402

# The serverless filesystem is ephemeral — a fresh instance starts with an
# empty /tmp. Migrations remain the local/deploy-pipeline discipline; here
# the schema is simply ensured on cold start so the demo is usable at once.
Base.metadata.create_all(engine)

from app.main import create_app  # noqa: E402

app = create_app()
