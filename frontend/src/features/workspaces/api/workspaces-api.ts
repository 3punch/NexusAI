import { apiFetch } from "../../../lib/api-client";

export interface Workspace {
  id: number;
  name: string;
  owner_id: number;
}

export const workspacesApi = {
  mine: () => apiFetch<Workspace[]>("/workspaces"),
};
