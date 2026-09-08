import { useState, type FormEvent } from "react";

import { useCreateTask } from "../hooks/use-create-task";

interface Props {
  workspaceId: number;
}

export default function CreateTaskForm({ workspaceId }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createTask = useCreateTask(workspaceId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || createTask.isPending) return;
    createTask.mutate(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
        },
      },
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>New task</h2>
      <div className="stack">
        <input
          placeholder="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Task title"
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-label="Task description"
        />
        {createTask.isError && (
          <div className="error-text">{String(createTask.error)}</div>
        )}
        <div className="row">
          <button type="submit" disabled={createTask.isPending || !title.trim()}>
            {createTask.isPending ? "Adding…" : "Add task"}
          </button>
        </div>
      </div>
    </form>
  );
}
