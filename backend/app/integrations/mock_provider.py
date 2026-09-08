"""Deterministic, offline provider used in development and tests.

Answers are computed from the provided context only — zero external calls —
so the entire stack runs without API keys. Determinism also makes the
assistant testable: same question + same context = same answer.
"""


class MockProvider:
    name = "mock"

    def generate(self, question: str, context: str) -> str:
        task_lines = [
            line.strip("- ").strip()
            for line in context.splitlines()
            if line.startswith("- ")
        ]
        summary = f"I found {len(task_lines)} task(s) in this workspace."
        return (
            f"[mock] You asked: '{question}'. {summary} "
            "This deterministic answer comes from MockProvider (no external AI call)."
        )
