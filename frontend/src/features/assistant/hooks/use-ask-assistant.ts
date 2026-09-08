import { useMutation } from "@tanstack/react-query";

import { assistantApi } from "../api/assistant-api";

export function useAskAssistant(workspaceId: number) {
  return useMutation({
    mutationFn: (question: string) =>
      assistantApi.ask({ workspace_id: workspaceId, question }),
  });
}
