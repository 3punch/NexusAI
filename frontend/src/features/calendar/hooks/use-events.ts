import { useQuery } from "@tanstack/react-query";

import { calendarApi } from "../api/calendar-api";

/**
 * Server state for one month of one workspace. The cache key includes the
 * month, so month navigation composes naturally (each month = one entry)
 * and invalidation after a write can be surgical.
 */
export function useEvents(workspaceId: number | null, year: number, month: number) {
  return useQuery({
    queryKey: ["events", workspaceId, year, month],
    queryFn: () => calendarApi.list(workspaceId as number, year, month),
    enabled: workspaceId !== null,
  });
}
