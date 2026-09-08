/**
 * Server-state cache (TanStack Query).
 *
 * Query keys follow the convention ["resource", ...params] so invalidation
 * can be surgical: invalidateQueries({ queryKey: ["tasks", workspaceId] })
 * hits exactly the affected list.
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
