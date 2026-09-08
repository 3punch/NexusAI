"""Logging setup.

Kept deliberately tiny: one function, called once at app startup. The point
of centralizing it is that log format/level are an application-wide concern,
not something individual modules should improvise.
"""

import logging


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    )
    # Quiet down SQLAlchemy's statement logging even in dev.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
