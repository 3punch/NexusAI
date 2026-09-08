import { useQuery } from "@tanstack/react-query";

import { tasksApi } from "../api/tasks-api";

export function useTasks(workspaceId: number | null) {
  return useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () => tasksApi.list(workspaceId as number),
    enabled: workspaceId !== null,
  });
}
