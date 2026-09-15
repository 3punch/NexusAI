"""Notebook execution service — runs the repo's ML notebooks server-side.

Deliberate design decisions:
- Execution happens in THIS backend process (nbclient + ipykernel installed
  in the same venv as the app). "Run" means run-here-now, on the user's own
  machine — it is arbitrary code execution by design, which is why the
  endpoint requires authentication and is a local-first tool.
- The target file must be an ``.ipynb`` sitting DIRECTLY in the repo root
  (the same directory the frontend catalogue links to). Anything else —
  traversal, subdirectories, non-notebooks — is rejected.
- ``allow_errors=True``: a notebook with a failing cell still returns its
  outputs, with the error rendered in the UI. Running is exploration, not
  a build.

The service is the only layer that touches nbformat/nbclient; routers stay
thin and the frontend only sees plain JSON cells.
"""

import json
import time
from pathlib import Path

import nbformat
from nbclient import NotebookClient
from sqlalchemy.orm import Session

from app.services.errors import BusinessRuleError, NotFoundError

REPO_ROOT = Path(__file__).resolve().parents[3]
RUN_TIMEOUT_SECONDS = 600


class NotebookService:
    def __init__(self, db: Session | None = None, notebooks_dir: Path | None = None) -> None:
        self.db = db
        self.notebooks_dir = (
            Path(notebooks_dir) if notebooks_dir is not None else REPO_ROOT
        )

    def run(self, *, user_id: int, file_name: str) -> dict:
        """Execute a repo-root notebook and return its executed cells."""
        target = self._resolve(file_name)
        notebook = nbformat.read(target, as_version=4)
        client = NotebookClient(
            notebook,
            timeout=RUN_TIMEOUT_SECONDS,
            kernel_name="python3",
            allow_errors=True,
        )
        started = time.perf_counter()
        client.execute()
        seconds = round(time.perf_counter() - started, 2)
        executed = json.loads(nbformat.writes(notebook))
        return {
            "file_name": target.name,
            "seconds": seconds,
            "cells": executed.get("cells", []),
        }

    def available_files(self) -> list[str]:
        return sorted(path.name for path in self.notebooks_dir.glob("*.ipynb"))

    def _resolve(self, file_name: str) -> Path:
        """Only plain .ipynb names directly inside the notebooks dir."""
        if (
            not file_name.endswith(".ipynb")
            or "/" in file_name
            or "\\" in file_name
            or ".." in file_name
        ):
            raise BusinessRuleError("invalid_notebook_name")
        root = self.notebooks_dir.resolve()
        target = (self.notebooks_dir / file_name).resolve()
        if target.parent != root or not target.is_file():
            raise NotFoundError("notebook_not_found")
        return target
