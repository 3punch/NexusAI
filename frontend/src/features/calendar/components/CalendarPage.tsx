import { useEffect, useMemo, useState } from "react";

import { formatApiError } from "../../../lib/api-client";
import { useMyWorkspaces } from "../../workspaces/hooks/use-my-workspaces";
import type { CalendarEvent } from "../api/calendar-api";
import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from "../hooks/use-event-mutations";
import { useEvents } from "../hooks/use-events";
import {
  buildMonthMatrix,
  isoToLocalInputValue,
  localDayKey,
  localInputToIso,
} from "../utils/month";
import EventForm from "./EventForm";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The Calendar page: month grid + selected-day panel + create/edit form.
 * It wires hooks together but contains no business logic — the grid math
 * lives in utils/month.ts, the cache strategy in the hooks, the rules in
 * the backend.
 */
export default function CalendarPage() {
  const workspaces = useMyWorkspaces();
  const todayKey = dayKeyOf(new Date());
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const events = useEvents(workspaceId, year, month);
  const createEvent = useCreateEvent(workspaceId ?? 0, year, month);
  const updateEvent = useUpdateEvent(workspaceId ?? 0, year, month);
  const deleteEvent = useDeleteEvent(workspaceId ?? 0, year, month);

  useEffect(() => {
    if (workspaceId === null && workspaces.data && workspaces.data.length > 0) {
      setWorkspaceId(workspaces.data[0].id);
    }
  }, [workspaces.data, workspaceId]);

  // Close the form when a save round-trip succeeds; reset for reuse.
  useEffect(() => {
    if (createEvent.isSuccess || updateEvent.isSuccess) {
      setCreating(false);
      setEditing(null);
      createEvent.reset();
      updateEvent.reset();
    }
  }, [createEvent, updateEvent]);

  const matrix = useMemo(() => buildMonthMatrix(year, month), [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events.data ?? []) {
      const key = localDayKey(event.starts_at);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events.data]);

  function moveMonth(offset: number) {
    const shifted = new Date(year, month - 1 + offset, 1);
    setYear(shifted.getFullYear());
    setMonth(shifted.getMonth() + 1);
    setSelectedDay(null);
    setCreating(false);
    setEditing(null);
  }

  function clearFormState() {
    setCreating(false);
    setEditing(null);
  }

  const formError = (createEvent.error ?? updateEvent.error) as Error | null;
  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const formInitial = editing
    ? {
        title: editing.title,
        description: editing.description,
        startsAtLocal: isoToLocalInputValue(editing.starts_at),
        endsAtLocal: isoToLocalInputValue(editing.ends_at),
      }
    : {
        title: "",
        description: "",
        startsAtLocal: selectedDay ? `${selectedDay}T09:00` : "",
        endsAtLocal: "",
      };

  return (
    <>
      <div className="card row">
        <h2 style={{ margin: 0 }}>Calendar</h2>
        <select
          aria-label="Workspace"
          value={workspaceId ?? ""}
          onChange={(changeEvent) => {
            setWorkspaceId(Number(changeEvent.target.value));
            clearFormState();
            setSelectedDay(null);
          }}
        >
          {(workspaces.data ?? []).map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <div className="row">
          <button
            type="button"
            className="secondary"
            aria-label="Previous month"
            onClick={() => moveMonth(-1)}
          >
            ‹
          </button>
          <strong>
            {MONTH_NAMES[month - 1]} {year}
          </strong>
          <button
            type="button"
            className="secondary"
            aria-label="Next month"
            onClick={() => moveMonth(1)}
          >
            ›
          </button>
        </div>
        {events.isLoading && <span className="muted">Loading…</span>}
      </div>

      {events.isError && (
        <div className="card">
          <div className="error-text">{formatApiError(events.error)}</div>
        </div>
      )}

      {workspaceId !== null && (
        <>
          <div className="card">
            <div className="calendar-grid" role="grid" aria-label="Month view">
              {WEEKDAYS.map((weekday) => (
                <div key={weekday} className="calendar-head">
                  {weekday}
                </div>
              ))}
              {matrix.flat().map((cell) => {
                const key = dayKeyOf(cell.date);
                const cellEvents = byDay.get(key) ?? [];
                const selected = selectedDay === key;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    className={`calendar-cell${cell.inMonth ? "" : " out"}${selected ? " selected" : ""}${key === todayKey ? " today" : ""}`}
                    onClick={() => {
                      setSelectedDay(key);
                      clearFormState();
                    }}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                        setSelectedDay(key);
                        clearFormState();
                      }
                    }}
                  >
                    <span className="calendar-day-num">{cell.date.getDate()}</span>
                    {cellEvents.slice(0, 3).map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        className="calendar-chip"
                        title={event.title}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          setSelectedDay(key);
                          clearFormState();
                          setEditing(event);
                        }}
                      >
                        {formatEventTime(event.starts_at)} {event.title}
                      </button>
                    ))}
                    {cellEvents.length > 3 && (
                      <span className="calendar-more">
                        +{cellEvents.length - 3} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className="card">
              <h2>{selectedDay}</h2>
              {dayEvents.length === 0 && (
                <div className="muted">No events on this day.</div>
              )}
              <div className="stack">
                {dayEvents.map((event) => (
                  <div className="task-item" key={event.id}>
                    <div>
                      <div>{event.title}</div>
                      <div className="muted">
                        {formatEventTime(event.starts_at)}
                        {event.ends_at ? ` – ${formatEventTime(event.ends_at)}` : ""}
                        {event.description ? ` — ${event.description}` : ""}
                      </div>
                    </div>
                    <div className="row">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setEditing(event);
                          setCreating(false);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          if (window.confirm(`Delete "${event.title}"?`)) {
                            deleteEvent.mutate(event.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {deleteEvent.isError && (
                <div className="error-text">{formatApiError(deleteEvent.error)}</div>
              )}
              <div className="row" style={{ marginTop: "0.6rem" }}>
                <button type="button" onClick={() => setCreating(true)}>
                  Add event
                </button>
              </div>
            </div>
          )}

          {(creating || editing) && selectedDay && (
            <EventForm
              key={editing ? `edit-${editing.id}` : `create-${selectedDay}`}
              mode={editing ? "edit" : "create"}
              initial={formInitial}
              busy={createEvent.isPending || updateEvent.isPending}
              error={formError ? formatApiError(formError) : null}
              onCancel={clearFormState}
              onSubmit={(values) => {
                const startsAtIso = localInputToIso(values.startsAtLocal);
                if (!startsAtIso) return;
                const endsAtIso = localInputToIso(values.endsAtLocal);
                if (editing) {
                  updateEvent.mutate({
                    eventId: editing.id,
                    values: {
                      title: values.title,
                      description: values.description,
                      startsAtIso,
                      endsAtIso,
                    },
                  });
                } else {
                  createEvent.mutate({
                    title: values.title,
                    description: values.description,
                    startsAtIso,
                    endsAtIso,
                  });
                }
              }}
              onDelete={
                editing
                  ? () => {
                      if (window.confirm(`Delete "${editing.title}"?`)) {
                        deleteEvent.mutate(editing.id);
                        clearFormState();
                      }
                    }
                  : undefined
              }
            />
          )}
        </>
      )}
    </>
  );
}



