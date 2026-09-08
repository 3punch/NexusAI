import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { actionsApi } from "../api/actions-api";

export function useActions(workspaceId: number) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["actions", workspaceId],
    queryFn: () => actionsApi.list(workspaceId),
  });

  const proposeDelete = useMutation({
    mutationFn: (taskId: number) => actionsApi.proposeDelete(workspaceId, taskId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["actions", workspaceId] }),
  });

  const decide = useMutation({
    mutationFn: ({
      actionId,
      decision,
    }: {
      actionId: number;
      decision: "approve" | "reject";
    }) => actionsApi.decide(actionId, decision),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["actions", workspaceId] });
      // An approval deletes a task — the task list must re-sync too.
      void queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });

  return { list, proposeDelete, decide };
}
