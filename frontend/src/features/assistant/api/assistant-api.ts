import { apiFetch } from "../../../lib/api-client";

export interface AskPayload {
  workspace_id: number;
  question: string;
}

export interface AskResponse {
  answer: string;
  provider: string;
}

export const assistantApi = {
  ask: (payload: AskPayload) =>
    apiFetch<AskResponse>("/assistant/ask", { method: "POST", body: payload }),
};
