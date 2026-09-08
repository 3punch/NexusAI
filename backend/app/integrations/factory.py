"""Provider factory — the single place configuration becomes a concrete object.

Adding a new vendor = one new adapter file + one branch here. Nothing else
in the codebase changes. This is the Open/Closed Principle in practice.
"""

from app.core.config import Settings, get_settings
from app.integrations.base import LLMProvider
from app.integrations.mock_provider import MockProvider
from app.integrations.openai_provider import OpenAIProvider


def build_llm_provider(settings: Settings | None = None) -> LLMProvider:
    settings = settings or get_settings()
    if settings.llm_provider == "openai":
        return OpenAIProvider(settings)
    return MockProvider()
