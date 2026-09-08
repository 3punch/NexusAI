"""Domain errors raised by services.

Routers translate these into HTTP status codes — that translation is the
ONLY place where Python exceptions become HTTP responses. Services never
raise ``HTTPException``; that keeps them framework-free and unit-testable.

Convention: the exception argument is a stable machine-readable string
(e.g. ``"not_a_workspace_member"``) that routers reuse as the HTTP detail.
"""


class NotFoundError(Exception):
    """A referenced entity does not exist (maps to 404)."""


class PermissionDeniedError(Exception):
    """The user may not perform this operation (maps to 403)."""


class BusinessRuleError(Exception):
    """The operation violates a domain rule (maps to 409)."""
