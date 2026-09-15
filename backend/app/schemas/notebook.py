"""Notebook schemas.

The executed response carries the notebook's cells as plain JSON (nbformat
shape). It can be large (plots are base64 PNGs) — that is expected for a
local-first tool.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NotebookRunRequest(BaseModel):
    file_name: str = Field(min_length=1, max_length=200)


class NotebookExecuted(BaseModel):
    model_config = ConfigDict(extra="allow")

    file_name: str
    seconds: float
    cells: list[dict[str, Any]]
