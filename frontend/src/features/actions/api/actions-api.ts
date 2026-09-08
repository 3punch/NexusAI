import { apiFetch } from "../../../lib/api-client";

export type ActionStatus = "pending" | "approved" | "rejected" | "executed";

export interface GovernedAction {
  id: number;
  workspace_id: number;
  kind: string;
  payload: Record<string, unknown>;
  status: ActionStatus;
  requested_by_id: number;
  decided_by_id: number | null;
  created_at: string;
  decided_at: string | null;
}

export const actionsApi = {
  list: (workspaceId: number) =>
    apiFetch<GovernedAction[]>(`/actions?workspace_id=${workspaceId}`),

  proposeDelete: (workspaceId: number, taskId: number) =>
    apiFetch<GovernedAction>("/actions", {
      method: "POST",
      body: {
        workspace_id: workspaceId,
        kind: "delete_task",
        payload: { task_id: taskId },
      },
    }),

  decide: (actionId: number, decision: "approve" | "reject") =>
    apiFetch<GovernedAction>(`/actions/${actionId}/${decision}`, {
      method: "POST",
    }),
};
