"""Auth endpoints — thin HTTP adapters over AuthService.

Rules of this layer:
- Parse request -> call service -> map result/errors to HTTP. Nothing else.
- If you are writing an ``if`` about WHO may do WHAT, it belongs in a service.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth_service import AuthService
from app.services.errors import BusinessRuleError

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "nexusai_refresh"
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 3600  # mirror REFRESH_TOKEN_EXPIRE_DAYS


def _set_refresh_cookie(response: Response, token: str) -> None:
    """The refresh token lives in an httpOnly cookie, NOT localStorage.

    - httponly: JavaScript can never read it (XSS cannot steal it)
    - path-scoped: it is only ever sent to /api/v1/auth endpoints
    - rotated on every refresh: a stolen old token dies quickly
    """
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    service = AuthService(db)
    try:
        return service.register(
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
        )
    except BusinessRuleError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from None


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    service = AuthService(db)
    user = service.authenticate(email=payload.email, password=payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials"
        )
    access_token, refresh_token = service.issue_tokens(user)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> TokenResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_refresh_token"
        )
    service = AuthService(db)
    user = service.user_from_refresh_token(token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh_token"
        )
    access_token, new_refresh = service.issue_tokens(user)
    _set_refresh_cookie(response, new_refresh)  # rotation: old token dies now
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
