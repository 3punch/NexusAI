"""Declarative base every ORM model inherits from.

Kept in its own module (instead of inside session.py) so that models can
import Base without importing the engine — models must never know how
connections are created.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
