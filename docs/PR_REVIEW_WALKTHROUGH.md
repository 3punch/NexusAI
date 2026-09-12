# NexusAI — PR Review Walkthrough

> **The capstone of the architecture docs.** Everything before this explained
> how the system is built; this document walks through *judging a change to
> it* — the skill you asked to finish with. It reviews a realistic, flawed PR
> finding-by-finding, using the checklist in
> [`TEAM_WORKFLOW.md`](TEAM_WORKFLOW.md). After this, no PR in this repo
> should intimidate you.

---

## 1. The 10-minute review protocol

1. **Read the PR description and the "How was this verified?" answer first.**
   An honest "I clicked through these flows" tells you what the author
   actually knows. A checked box with nothing behind it is itself a finding.
2. **Skim the diff's shape before its content.** Which files changed? A
   backend feature that only touches `api/v1/` and `features/*/components/`
   is suspicious *by shape* — business logic has to live somewhere, and
   neither of those is it.
3. **Read the diff by layer, top-down:** schemas → services → repositories →
   routers on the backend; api → hooks → components on the frontend.
4. **Run the branch locally** for anything behavior-heavy (`pytest` is
   20 seconds; the demo flow is 2 minutes).
5. **Walk the checklist** (`TEAM_WORKFLOW.md` §4) top-down, then decide:
   Comment / Request changes / Approve.

The meta-habit that separates confident reviewers: **ask where code landed
before asking how it's written.** A perfectly-formatted function in the
wrong layer is still a defect.

---

## 2. The scenario

**Issue #9:** *"Deleting a task takes too many clicks — add a quick delete."*

Contributor Kai opens **PR #9 — "feat: quick delete button with instant
removal"** with this description:

> Adds a DELETE /tasks/{id} endpoint and a delete button on each task that
> removes it instantly. Feels much faster than the governed flow.
>
> **How was this verified?** ☑ Manually tested, works.

The claimed verification is thin, the phrase "instantly" should raise an
eyebrow (instant = no governance?), and the diff touches exactly the two
layers that should contain the *least* logic. Let's review it.

## 3. The submitted diff (as proposed)

**`backend/app/api/v1/tasks.py`** — new endpoint:

```python
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def quick_delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="task_not_found")
    if task.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="only_creator_can_delete")
    db.delete(task)
    db.commit()
    return None
```

**`frontend/src/features/tasks/components/TaskList.tsx`** — new button:

```tsx
<button
  className="danger"
  onClick={async () => {
    const token = localStorage.getItem("nexusai_token");
    const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) window.location.reload();
  }}
>
  Delete
</button>
```

**`frontend/src/stores/auth-store.ts`** — persistence added:

```ts
setSession: (user, accessToken) => {
  localStorage.setItem("nexusai_token", accessToken);  // "survive refresh"
  set({ user, accessToken });
},
```

Small diff, readable, *and almost every line crosses a boundary*. 

---

## 4. Finding-by-finding review

### Finding 0 — "Does this feature already exist?" (always ask this first)

Before any code critique: the task list **already has** a "Propose delete"
button wired to `useActions().proposeDelete`, and the ActionsPanel renders
pending actions with Approve/Reject. The governed flow *is* the delete
feature. PR #9 isn't missing functionality — it's re-implementing it, worse.

**Reviewer habit #1: the cheapest review comment is "this exists — what's
the actual gap you're trying to close?"** Often the author's real need is UX
("too many clicks"), which has solutions that don't touch the architecture
(see §6).

### Finding 1 — There is no `DELETE /tasks/{id}` endpoint. Deliberately.

📍 `backend/app/api/v1/tasks.py` · Rule: `ARCHITECTURE_MAP.md` §5

Deletion is a **governed action** (`services/action_service.py`,
`models/action.py`): proposed, decided by a *second* member, executed
atomically, recorded in an audit ledger. That is not scaffolding waiting to
be optimized away — it is the product's integrity model. A direct DELETE
endpoint doesn't add a faster delete; it adds a way to bypass two-person
approval entirely.

**Consequence if merged:** any workspace member who can craft a request
deletes any task they created, silently, with no ledger entry. The next
"who deleted this?" conversation has no answer.

**Verdict contribution:** Request changes. The fix is to not build it.

### Finding 2 — SQL and commit in a router

📍 the `db.query(Task)...db.commit()` lines · Rule: §2 dependency table, §3
`repositories/`

Even if a direct delete were wanted, this is where it *wouldn't* go. The
dependency rule allows SQL in exactly one layer. When the router queries,
three things break: the rule "every query is findable in
`app/repositories/`" becomes false; the authorization decision (next
finding) sits in the hardest layer to unit-test; and the next contributor
now has two precedents to copy.

**The shape tells you first:** this endpoint is ~15 lines while every
existing task endpoint is ~5. Proportion is a review signal.

### Finding 3 — The authorization rule is wrong twice

📍 `if task.created_by_id != current_user.id` · Rule: §3 `services/`,
tenancy invariant

Two problems in one line:

1. **Wrong rule.** "Only the creator may delete" isn't NexusAI's model —
   workspace *members* govern together (proposer + a different approver).
   This check makes the feature stricter than governance while bypassing
   its point.
2. **Wrong layer.** Whether Alice may touch workspace 7 is a business
   decision that lives in services (`_require_member` →
   `WorkspaceRepository.is_member`), never inlined in a router. Routers
   translate; services decide.

**Reviewer habit #2:** for any auth-touching line, ask "which service
method *would have* made this decision, and why didn't it?"

### Finding 4 — `fetch()` in a component + token in `localStorage`

📍 `TaskList.tsx` button, `auth-store.ts` `setSession` · Rule: §6
authentication architecture, §4 `lib/`

The frontend rules exist in pairs: **one HTTP doorway** (`apiFetch`) and
**token in memory only**. The diff violates both, and they compound:

- `localStorage.getItem("nexusai_token")` makes the access token readable by
  any script that ever runs in the page — the exact XSS scenario the
  httpOnly-cookie design exists to prevent (`ARCHITECTURE_MAP.md` §6).
- A raw `fetch` bypasses the 401 → refresh → retry recovery, so the button
  mysteriously fails for anyone whose 15-minute token expired — a failure
  `api-client.test.ts` proves the doorway already solves.
- `window.location.reload()` throws away the whole query cache to update
  one list — the antipattern the optimistic-update hook exists to replace.

**Note the store change is the most dangerous line in the PR** — it's the
smallest, looks like a courtesy ("survive refresh"), and quietly defeats the
security model. Reviewers: read the *incidental-looking* lines hardest.

### Finding 5 — "Manually tested" is not verification for rules

📍 PR description · Rule: `TEAM_WORKFLOW.md` §4, correctness

The two behaviors that make deletion safe (second-person approval, tenancy
denial) are precisely what manual clicking won't exercise.
`tests/test_actions.py` shows the pattern: positive path *plus* negative
tests (self-approval 409, outsider 403). A PR that changes an enforcement
rule without a negative test is requesting approval for unverified security
behavior.

**Verdict: Request changes.** Findings 1 and 4 block independently; 2, 3
and 5 are structural; 0 reframes the whole PR.

---

## 5. The review comment you'd actually post

> Kai — thanks for the initiative; the UX instinct (delete takes too many
> clicks) is right, and the button placement is good. Marking this
> **Request changes**, but the path forward is small and mostly reuses
> things you'll like.
>
> **The blocker:** deletion in NexusAI is a governed action by design —
> propose → a *second member* approves → atomic execution + audit trail
> (`docs/REQUEST_FLOW.md` Trace 4). The proposed `DELETE /tasks/{id}`
> bypasses that, and its `created_by_id` check isn't our rule (members
> govern together). This isn't an omission to fix — there is deliberately
> no delete endpoint (`docs/ARCHITECTURE_MAP.md` §5).
>
> **Also blocking, smaller:** the button calls `fetch` directly and the
> store writes the token to `localStorage` — that makes the token readable
> by any injected script (our design: token in memory only, refresh in an
> httpOnly cookie — ARCHITECTURE_MAP §6). Please use the existing
> `actionsApi.proposeDelete` via `apiFetch` and drop the localStorage
> change. The `window.location.reload()` also fights the query cache —
> `useActions` already invalidates correctly.
>
> **The real opportunity:** if the governed flow feels slow, let's fix that
> without touching the architecture — e.g. show the task title on pending
> actions so approvers aren't approving blind ids, or optimistic pending
> state on propose. Both are small PRs I'd review fast. Happy to pair.

Notice the structure: **genuine praise → what and why (linked to docs) →
concrete alternative → door open.** "Request changes" with a map forward is
mentoring, not gatekeeping.

---

## 6. The PR as it should have been

The real gap behind issue #9 is UX: **approvers decide blind** (the panel
shows `delete_task — task #2`, not what #2 is) and **proposing gives no
feedback**. Here's the approvable version of Kai's energy:

**`frontend/src/features/actions/components/ActionsPanel.tsx`** — resolve
titles from data the app already has (no new fetching, no new state):

```tsx
import { useTasks } from "../../tasks/hooks/use-tasks";

// inside the component:
const tasks = useTasks(workspaceId);
const titleFor = (id: number) =>
  (tasks.data ?? []).find((task) => task.id === id)?.title ?? `task #${id}`;

// in the row:
<div>
  {action.kind} — “{titleFor(Number(action.payload.task_id))}”
</div>
```

**`frontend/src/features/actions/hooks/use-actions.ts`** — optimistic
pending entry, mirroring `use-create-task.ts`:

```ts
onMutate: async (taskId) => {
  await queryClient.cancelQueries({ queryKey: ["actions", workspaceId] });
  const previous = queryClient.getQueryData<GovernedAction[]>(["actions", workspaceId]);
  queryClient.setQueryData<GovernedAction[]>(["actions", workspaceId], (old) => [
    { id: -Date.now(), workspace_id: workspaceId, kind: "delete_task",
      payload: { task_id: taskId }, status: "pending",
      requested_by_id: -1, decided_by_id: null,
      created_at: new Date().toISOString(), decided_at: null },
    ...(old ?? []),
  ]);
  return { previous };
},
onError: (_e, _v, ctx) => {
  if (ctx?.previous) queryClient.setQueryData(["actions", workspaceId], ctx.previous);
},
onSettled: () => queryClient.invalidateQueries({ queryKey: ["actions", workspaceId] }),
```

Zero backend changes. Zero new layers. Two features users feel. **That** is
what "approve" looks like: the checklist passes *and* the change is small
enough that the checklist passes honestly.

The meta-lesson for issue-driven work: **when a reviewer says "this already
exists," the follow-up question is "what made it feel missing?"** — the
answer is usually a UX gap, not an architecture gap.

---

## 7. Verdict cheat sheet

| Verdict | Use when | Example from this walkthrough |
|---|---|---|
| **Approve** | Checklist passes; small, tested, doc'd | §6's title-resolution + optimistic pending |
| **Comment** | Questions or nits; nothing blocking | "Should this badge label match the others?" |
| **Request changes** | Any §4 architecture/security violation; behavior without tests; wrong rule in the wrong layer | PR #9's findings 1, 3, 4, 5 |

Three reviewer's vows, worth adopting as identity:

1. **I own my approvals.** I only approve what I'd ship on my watch.
2. **I review the shape first** — which layers changed tells me what to look
   for.
3. **I never block without a path forward.** Every Request changes comes
   with the fix mapped, ideally linked to the doc that explains the rule.

---

## 8. Self-training: three mini-reviews

Cover the answers, decide Comment / Request changes / Approve, and — the
harder part — *which rule*.

**A.** A PR adds to `backend/app/services/task_service.py`:
`from fastapi import HTTPException` … `raise HTTPException(404, "task_not_found")`.

**B.** A PR adds a "duplicate task" button in `TaskList.tsx` that builds the
new task locally and calls `queryClient.setQueryData(["tasks", id], …)`
directly, with no API call.

**C.** A PR moves the `title` length check from `schemas/task.py`
(`Field(max_length=200)`) into `TaskService.create`
(`if len(title) > 200: raise BusinessRuleError`).

**Answers.**

**A — Request changes.** Services never import HTTP (dependency rule §2);
`NotFoundError("task_not_found")` + the router's `http_error_for` mapping is
the pattern; the 404 still reaches the client unchanged.

**B — Request changes.** The task never reaches the database, so a reload
or refetch "loses" it — a lie the UI tells the user. Writes go through
`tasksApi` → TanStack mutation (optimistic update if desired), never
cache-mutation alone. (Cache mutation is a *layer* of a write, not the
write.)

**C — Comment.** Subtle: this is duplication of a *validation* concern, not
a business rule. Boundary constraints belong in schemas (one place, uniform
422s); services own rules the schema *can't* express (membership,
governance). Approving with a comment to revert the duplication — or
Request changes if the team prefers strictness. Judgment calls like this
are exactly what `good first review` practice is for; when unsure, Comment
beats silence.

---

*End of the architecture series: `ARCHITECTURE_MAP.md` (the rules) →
`REQUEST_FLOW.md` (the motion) → `ARCHITECTURE_COMPARISON.md` (the
influences) → `TEAM_WORKFLOW.md` (the collaboration) → this document (the
judgment). You now have the full loop: build it, trace it, compare it,
share it, review it.*



