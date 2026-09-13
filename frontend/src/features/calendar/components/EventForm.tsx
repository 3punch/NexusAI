import { useState, type FormEvent } from "react";

export interface EventFormValues {
  title: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
}

interface Props {
  mode: "create" | "edit";
  initial: EventFormValues;
  busy: boolean;
  error: string | null;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
  /** Provided in edit mode — deletion lives with the form, like the flow. */
  onDelete?: () => void;
}

/**
 * Shared create/edit form for calendar events. The parent converts the
 * local datetime-local values to ISO instants (utils/month.ts) — the form
 * stays presentation-only.
 */
export default function EventForm({
  mode,
  initial,
  busy,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [startsAtLocal, setStartsAtLocal] = useState(initial.startsAtLocal);
  const [endsAtLocal, setEndsAtLocal] = useState(initial.endsAtLocal);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || !title.trim() || !startsAtLocal) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      startsAtLocal,
      endsAtLocal,
    });
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{mode === "create" ? "New event" : "Edit event"}</h2>
      <div className="stack">
        <input
          placeholder="Event title"
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          aria-label="Event title"
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(changeEvent) => setDescription(changeEvent.target.value)}
          aria-label="Event description"
        />
        <label className="muted" htmlFor="event-starts">
          Starts
        </label>
        <input
          id="event-starts"
          type="datetime-local"
          value={startsAtLocal}
          onChange={(changeEvent) => setStartsAtLocal(changeEvent.target.value)}
          required
        />
        <label className="muted" htmlFor="event-ends">
          Ends (optional)
        </label>
        <input
          id="event-ends"
          type="datetime-local"
          value={endsAtLocal}
          onChange={(changeEvent) => setEndsAtLocal(changeEvent.target.value)}
        />
        {error && <div className="error-text">{error}</div>}
        <div className="row">
          <button type="submit" disabled={busy || !title.trim() || !startsAtLocal}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          {onDelete && (
            <button type="button" className="danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
