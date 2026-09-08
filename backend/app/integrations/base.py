"""LLM provider interface — the ONLY thing the rest of the app knows about AI.

``integrations/`` is the only layer allowed to import third-party AI SDKs or
speak to external services. Everything upstream depends on this Protocol,
not on any vendor — swap vendors, never touch services.

What belongs here: provider protocols, HTTP clients for external APIs,
request/response mapping to vendor formats.
What never belongs here: business rules, database access, HTTP routers.
"""

from typing import Protocol


class LLMProvider(Protocol):
    """Structural interface for every AI provider adapter."""

    name: str

    def generate(self, question: str, context: str) -> str: ...
