import { formatApiError } from "../../../lib/api-client";
import { useActions } from "../hooks/use-actions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  executed: "Executed",
};

interface Props {
  workspaceId: number;
}

export default function ActionsPanel({ workspaceId }: Props) {
  const { list, decide, proposeDelete } = useActions(workspaceId);

  return (
    <div className="card">
      <h2>Governed actions</h2>
      <p className="muted">
        Destructive operations require a second person's approval: propose →
        approve → execute. The proposer cannot approve their own action.
      </p>
      {(list.data ?? []).length === 0 && (
        <div className="muted">
          No actions yet. Propose a deletion from the task list.
        </div>
      )}
      <div className="stack">
        {(list.data ?? []).map((action) => (
          <div className="task-item" key={action.id}>
            <div>
              <div>
                {action.kind} — task #{String(action.payload.task_id)}
              </div>
              <div className="muted">{STATUS_LABELS[action.status]}</div>
            </div>
            {action.status === "pending" && (
              <div className="row">
                <button
                  onClick={() =>
                    decide.mutate({ actionId: action.id, decision: "approve" })
                  }
                >
                  Approve
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    decide.mutate({ actionId: action.id, decision: "reject" })
                  }
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {decide.isError && <div className="error-text">{formatApiError(decide.error)}</div>}
      {proposeDelete.isError && (
        <div className="error-text">{formatApiError(proposeDelete.error)}</div>
      )}
    </div>
  );
}
