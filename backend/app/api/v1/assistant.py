"""Assistant endpoints.

The provider arrives via Depends(get_llm_provider) — the router neither knows
nor cares whether it is talking to the mock or to OpenAI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_llm_provider
from app.api.errors import http_error_for
from app.db.session import get_db
from app.integrations.base import LLMProvider
from app.models import User
from app.schemas.assistant import AskRequest, AskResponse
from app.services.assistant_service import AssistantService
from app.services.errors import PermissionDeniedError

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/ask", response_model=AskResponse)
def ask(
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
) -> AskResponse:
    service = AssistantService(db, provider)
    try:
        answer, provider_name = service.ask(
            user_id=current_user.id,
            workspace_id=payload.workspace_id,
            question=payload.question,
        )
    except PermissionDeniedError as exc:
        raise http_error_for(exc) from None
    return AskResponse(answer=answer, provider=provider_name)
