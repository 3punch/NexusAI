"""Notebook execution flow.

Execution tests use a tiny synthetic notebook in a tmp directory (fast and
deterministic) — the real repo notebooks are never executed in CI. Router
tests cover the auth + validation boundaries without running a kernel.
"""

import nbformat
import pytest
from fastapi.testclient import TestClient

from app.services.errors import BusinessRuleError, NotFoundError
from app.services.notebook_service import NotebookService
from conftest import auth_headers, register_and_login


def _tiny_notebook(path, code: str = "print('hello from notebook')") -> None:
    notebook = nbformat.v4.new_notebook()
    notebook.cells.append(nbformat.v4.new_code_cell(code))
    nbformat.write(notebook, path)


def test_run_executes_print_cell(tmp_path) -> None:
    _tiny_notebook(tmp_path / "tiny.ipynb")
    service = NotebookService(notebooks_dir=tmp_path)

    result = service.run(user_id=1, file_name="tiny.ipynb")

    assert result["file_name"] == "tiny.ipynb"
    code_cells = [cell for cell in result["cells"] if cell["cell_type"] == "code"]
    streams = [
        "".join(output.get("text", []))
        for cell in code_cells
        for output in cell.get("outputs", [])
        if output["output_type"] == "stream"
    ]
    assert any("hello from notebook" in text for text in streams)


def test_run_captures_cell_errors_but_still_returns(
    tmp_path,
) -> None:
    _tiny_notebook(tmp_path / "tiny.ipynb", code="raise ValueError('boom')")
    service = NotebookService(notebooks_dir=tmp_path)

    result = service.run(user_id=1, file_name="tiny.ipynb")

    code_cells = [cell for cell in result["cells"] if cell["cell_type"] == "code"]
    errors = [
        output
        for cell in code_cells
        for output in cell.get("outputs", [])
        if output["output_type"] == "error"
    ]
    assert len(errors) == 1
    assert errors[0]["ename"] == "ValueError"


def test_unknown_notebook_not_found(tmp_path) -> None:
    service = NotebookService(notebooks_dir=tmp_path)
    with pytest.raises(NotFoundError):
        service.run(user_id=1, file_name="missing.ipynb")


@pytest.mark.parametrize(
    "bad_name",
    ["../secrets.ipynb", "sub/dir/notebook.ipynb", "not-a-notebook.txt", ".."],
)
def test_rejects_names_that_escape_the_notebooks_dir(tmp_path, bad_name) -> None:
    service = NotebookService(notebooks_dir=tmp_path)
    with pytest.raises(BusinessRuleError):
        service.run(user_id=1, file_name=bad_name)


def test_run_requires_auth(client: TestClient) -> None:
    response = client.post("/api/v1/notebooks/run", json={"file_name": "x.ipynb"})
    assert response.status_code == 401


def test_run_unknown_notebook_returns_404(client: TestClient) -> None:
    session = register_and_login(client)
    response = client.post(
        "/api/v1/notebooks/run",
        json={"file_name": "missing.ipynb"},
        headers=auth_headers(session["token"]),
    )
    assert response.status_code == 404
