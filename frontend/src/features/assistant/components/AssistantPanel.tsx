import { useState, type FormEvent } from "react";

import { formatApiError } from "../../../lib/api-client";
import { useAskAssistant } from "../hooks/use-ask-assistant";

interface Props {
  workspaceId: number;
}

export default function AssistantPanel({ workspaceId }: Props) {
  const [question, setQuestion] = useState("");
  const ask = useAskAssistant(workspaceId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || ask.isPending) return;
    ask.mutate(trimmed);
  }

  return (
    <div className="card">
      <h2>AI assistant</h2>
      <p className="muted">
        Answers are grounded in this workspace's tasks. In development the mock
        provider answers deterministically — zero external AI calls.
      </p>
      <form className="row" onSubmit={handleSubmit}>
        <input
          placeholder="e.g. What is on my plate?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          aria-label="Question"
        />
        <button type="submit" disabled={ask.isPending || !question.trim()}>
          {ask.isPending ? "Thinking…" : "Ask"}
        </button>
      </form>
      {ask.isError && <div className="error-text">{formatApiError(ask.error)}</div>}
      {ask.data && (
        <div>
          <strong>{ask.data.provider}:</strong> {ask.data.answer}
        </div>
      )}
    </div>
  );
}
