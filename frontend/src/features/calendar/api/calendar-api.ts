import { apiFetch } from "../../../lib/api-client";

/**
 * Calendar API adapter — typed mirror of backend `schemas/event.py`.
 * ISO strings always carry an explicit UTC offset from the API.
 */

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  workspace_id: number;
  created_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventPayload {
  workspace_id: number;
  title: string;
  description?: string;
  starts_at: string;
  ends_at?: string | null;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string | null;
}

export const calendarApi = {
  list: (workspaceId: number, year: number, month: number) =>
    apiFetch<CalendarEvent[]>(
      `/events?workspace_id=${workspaceId}&year=${year}&month=${month}`,
    ),

  create: (payload: CreateEventPayload) =>
    apiFetch<CalendarEvent>("/events", { method: "POST", body: payload }),

  update: (eventId: number, payload: UpdateEventPayload) =>
    apiFetch<CalendarEvent>(`/events/${eventId}`, {
      method: "PATCH",
      body: payload,
    }),

  remove: (eventId: number) =>
    apiFetch<void>(`/events/${eventId}`, { method: "DELETE" }),
};
