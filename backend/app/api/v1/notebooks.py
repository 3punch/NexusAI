"""Notebook execution endpoints.

"Run" executes a repo-root .ipynb in this backend process (nbclient +
ipykernel) and returns the executed cells. Authentication is required; the
target name is validated against traversal in the service. Executing
arbitrary code is the point of a local-first tool — it is NOT exposed
beyond this machine.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.errors import http_error_for
from app.db.session import get_db
from app.models import User
from app.schemas.notebook import NotebookExecuted, NotebookRunRequest
from app.services.errors import BusinessRuleError, NotFoundError
from app.services.notebook_service import NotebookService

router = APIRouter(prefix="/notebooks", tags=["notebooks"])

DOMAIN_ERRORS = (NotFoundError, BusinessRuleError)


@router.post("/run", response_model=NotebookExecuted)
def run_notebook(
    payload: NotebookRunRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotebookExecuted:
    service = NotebookService()
    try:
        result = service.run(user_id=current_user.id, file_name=payload.file_name)
    except DOMAIN_ERRORS as exc:
        raise http_error_for(exc) from None
    return NotebookExecuted(**result)
