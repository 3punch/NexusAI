import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tasksApi, type Task } from "../api/tasks-api";

/**
 * Optimistic create — the canonical TanStack Query write pattern:
 *
 *   onMutate: cancel in-flight reads, snapshot the cache, insert a temporary
 *             task so the UI updates with zero perceived latency
 *   onError:  roll back to the snapshot
 *   onSettled: re-sync with the server either way
 *
 * This hook — not the component — owns the caching strategy, so any other
 * component reusing it gets identical behavior.
 */
export function useCreateTask(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      tasksApi.create({
        workspace_id: workspaceId,
        title: input.title,
        description: input.description,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", workspaceId] });
      const previous = queryClient.getQueryData<Task[]>(["tasks", workspaceId]);
      const optimistic: Task = {
        id: -Date.now(), // negative id = not-yet-persisted marker
        title: input.title,
        description: input.description,
        status: "todo",
        workspace_id: workspaceId,
        created_by_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Task[]>(["tasks", workspaceId], (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks", workspaceId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}
