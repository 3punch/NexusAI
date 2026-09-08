"""OpenAI-backed provider adapter.

Only instantiated when explicitly configured (``LLM_PROVIDER=openai``).
This file is the ONLY module in the codebase that knows OpenAI's API shape —
if the vendor changes their contract, this is the only file to fix.
"""

import httpx

from app.core.config import Settings


class OpenAIProvider:
    name = "openai"

    def __init__(self, settings: Settings) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set")
        self._api_key = settings.openai_api_key
        self._model = settings.openai_model

    def generate(self, question: str, context: str) -> str:
        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "model": self._model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are NexusAI's workspace assistant. Answer using "
                            "ONLY the provided workspace context."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion: {question}",
                    },
                ],
                "temperature": 0.2,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        return str(response.json()["choices"][0]["message"]["content"])
