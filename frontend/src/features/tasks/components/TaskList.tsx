import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi, type Task, type TaskStatus } from "../api/tasks-api";
import { useTasks } from "../hooks/use-tasks";
import { formatApiError } from "../../../lib/api-client";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

interface Props {
  workspaceId: number;
  /** Deletion is never direct — the parent opens a governed action. */
  onProposeDelete: (task: Task) => void;
}

export default function TaskList({ workspaceId, onProposeDelete }: Props) {
  const tasks = useTasks(workspaceId);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.updateStatus(taskId, status),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] }),
  });

  if (tasks.isLoading) {
    return (
      <div className="card">
        <span className="muted">Loading tasks…</span>
      </div>
    );
  }

  if (tasks.isError) {
    return (
      <div className="card">
        <div className="error-text">{formatApiError(tasks.error)}</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Tasks ({tasks.data?.length ?? 0})</h2>
      {(tasks.data ?? []).length === 0 && (
        <div className="muted">No tasks yet — add the first one.</div>
      )}
      <div className="stack">
        {(tasks.data ?? []).map((task) => (
          <div className="task-item" key={task.id}>
            <div>
              <div>{task.title}</div>
              {task.description && <div className="muted">{task.description}</div>}
            </div>
            <div className="row">
              <span className="badge">{STATUS_LABELS[task.status]}</span>
              <select
                aria-label={`Change status for ${task.title}`}
                value={task.status}
                onChange={(event) =>
                  updateStatus.mutate({
                    taskId: task.id,
                    status: event.target.value as TaskStatus,
                  })
                }
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
              <button className="danger" onClick={() => onProposeDelete(task)}>
                Propose delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
