import { apiFetch } from "../../../lib/api-client";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  workspace_id: number;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  workspace_id: number;
  title: string;
  description?: string;
}

export const tasksApi = {
  list: (workspaceId: number) =>
    apiFetch<Task[]>(`/tasks?workspace_id=${workspaceId}`),

  create: (payload: CreateTaskPayload) =>
    apiFetch<Task>("/tasks", { method: "POST", body: payload }),

  updateStatus: (taskId: number, status: TaskStatus) =>
    apiFetch<Task>(`/tasks/${taskId}`, { method: "PATCH", body: { status } }),
};
