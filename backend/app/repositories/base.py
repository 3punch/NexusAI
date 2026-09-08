"""Generic repository base.

A repository encapsulates ALL SQLAlchemy querying for one aggregate. Services
call repositories; they never build queries themselves. Benefits: business
rules stay testable without a database, and query optimization happens in
exactly one layer.

What belongs here: queries, persistence, mapping rows <-> models.
What never belongs here: HTTP concerns, authorization rules, formatting.
"""

from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from app.db.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Subclasses set ``model`` and add aggregate-specific queries."""

    model: type[ModelT]

    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, obj_id: int) -> ModelT | None:
        return self.db.get(self.model, obj_id)

    def add(self, obj: ModelT) -> ModelT:
        """Stage + flush so autoincrement IDs are available to callers.

        Flush is NOT commit — the unit of work is committed by the service.
        """
        self.db.add(obj)
        self.db.flush()
        return obj

    def list_all(self) -> list[ModelT]:
        return list(self.db.query(self.model).all())

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
