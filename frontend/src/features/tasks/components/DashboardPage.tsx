import { useEffect, useState } from "react";

import { useActions } from "../../actions/hooks/use-actions";
import ActionsPanel from "../../actions/components/ActionsPanel";
import AssistantPanel from "../../assistant/components/AssistantPanel";
import { useMyWorkspaces } from "../../workspaces/hooks/use-my-workspaces";
import CreateTaskForm from "./CreateTaskForm";
import TaskList from "./TaskList";

/**
 * The composition page: it wires features together but contains no business
 * logic of its own. Notice how each feature brings its own components —
 * adding a feature never touches another feature's internals.
 */
export default function DashboardPage() {
  const workspaces = useMyWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const { proposeDelete } = useActions(workspaceId ?? 0);

  useEffect(() => {
    if (workspaceId === null && workspaces.data && workspaces.data.length > 0) {
      setWorkspaceId(workspaces.data[0].id);
    }
  }, [workspaces.data, workspaceId]);

  return (
    <>
      <div className="card row">
        <h2 style={{ margin: 0 }}>Workspace</h2>
        <select
          aria-label="Workspace"
          value={workspaceId ?? ""}
          onChange={(event) => setWorkspaceId(Number(event.target.value))}
        >
          {(workspaces.data ?? []).map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        {workspaces.isLoading && <span className="muted">Loading…</span>}
      </div>

      {workspaceId !== null && (
        <>
          <CreateTaskForm workspaceId={workspaceId} />
          <TaskList
            workspaceId={workspaceId}
            onProposeDelete={(task) => proposeDelete.mutate(task.id)}
          />
          <ActionsPanel workspaceId={workspaceId} />
          <AssistantPanel workspaceId={workspaceId} />
        </>
      )}
    </>
  );
}
