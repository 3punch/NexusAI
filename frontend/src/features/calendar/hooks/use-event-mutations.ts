import { useMutation, useQueryClient } from "@tanstack/react-query";

import { calendarApi, type CalendarEvent } from "../api/calendar-api";
import { localDayKey } from "../utils/month";

export interface EventInputValues {
  title: string;
  description: string;
  startsAtIso: string;
  endsAtIso: string | null;
}

function useInvalidateEvents(workspaceId: number, year: number, month: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: ["events", workspaceId, year, month],
    });
  };
}

/**
 * Cache strategy for calendar writes — the tasks pattern applied to events:
 * cancel → snapshot → optimistic set → rollback on error → invalidate always.
 * This hook — not the component — owns the caching strategy.
 */
export function useCreateEvent(workspaceId: number, year: number, month: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvents(workspaceId, year, month);
  const key = ["events", workspaceId, year, month] as const;

  return useMutation({
    mutationFn: (values: EventInputValues) =>
      calendarApi.create({
        workspace_id: workspaceId,
        title: values.title,
        description: values.description,
        starts_at: values.startsAtIso,
        ends_at: values.endsAtIso,
      }),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      // Optimistic insert only when the event lands inside the displayed
      // month (local wall clock — the same convention the grid renders in).
      const dayPrefix = `${year}-${String(month).padStart(2, "0")}`;
      if (localDayKey(values.startsAtIso).startsWith(dayPrefix)) {
        const optimistic: CalendarEvent = {
          id: -Date.now(), // negative id = not-yet-persisted marker
          title: values.title,
          description: values.description,
          starts_at: values.startsAtIso,
          ends_at: values.endsAtIso,
          workspace_id: workspaceId,
          created_by_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<CalendarEvent[]>(key, (old) => [
          ...(old ?? []),
          optimistic,
        ]);
      }
      return { previous };
    },
    onError: (_error, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: invalidate,
  });
}

export function useUpdateEvent(workspaceId: number, year: number, month: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvents(workspaceId, year, month);
  const key = ["events", workspaceId, year, month] as const;

  return useMutation({
    mutationFn: ({
      eventId,
      values,
    }: {
      eventId: number;
      values: EventInputValues;
    }) =>
      calendarApi.update(eventId, {
        title: values.title,
        description: values.description,
        starts_at: values.startsAtIso,
        ends_at: values.endsAtIso ?? undefined, // omit = "not provided"
      }),
    onMutate: async ({ eventId, values }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      queryClient.setQueryData<CalendarEvent[]>(key, (old) =>
        (old ?? []).map((event) =>
          event.id === eventId
            ? {
                ...event,
                title: values.title,
                description: values.description,
                starts_at: values.startsAtIso,
                ends_at: values.endsAtIso,
              }
            : event,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: invalidate,
  });
}

export function useDeleteEvent(workspaceId: number, year: number, month: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateEvents(workspaceId, year, month);
  const key = ["events", workspaceId, year, month] as const;

  return useMutation({
    mutationFn: (eventId: number) => calendarApi.remove(eventId),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      queryClient.setQueryData<CalendarEvent[]>(key, (old) =>
        (old ?? []).filter((event) => event.id !== eventId),
      );
      return { previous };
    },
    onError: (_error, _eventId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: invalidate,
  });
}
