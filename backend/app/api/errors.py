"""Domain-error -> HTTP translation.

The single place where Python exceptions become HTTP responses. Routers call
``http_error_for`` in a ``except (NotFoundError, PermissionDeniedError,
BusinessRuleError)`` block — a reviewer can verify every endpoint maps domain
errors consistently in one glance.
"""

from fastapi import HTTPException, status

from app.services.errors import BusinessRuleError, NotFoundError, PermissionDeniedError


def http_error_for(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, PermissionDeniedError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, BusinessRuleError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="internal_error")
