import { useQuery } from "@tanstack/react-query";

import { workspacesApi } from "../api/workspaces-api";

export function useMyWorkspaces() {
  return useQuery({
    queryKey: ["workspaces", "mine"],
    queryFn: workspacesApi.mine,
    staleTime: 5 * 60_000,
  });
}
