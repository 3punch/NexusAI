# Contributing to NexusAI

Thanks for contributing! The rules below exist to keep the codebase
reviewable — they are short on purpose, and every one of them traces back to
an architectural decision documented in [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md).

## Getting started

1. Read [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) once — it is the map of the territory.
2. Copy `.env.example` to `.env` (never commit `.env`).
3. `docker compose up --build`, or the two-terminal setup in the README.
4. Pick an issue, comment that you're taking it, and open a **draft PR early**.

## Branching

```
feature/<issue#>-<short-name>      e.g. feature/42-task-assignments
fix/<issue#>-<short-name>          e.g. fix/17-refresh-loop
docs/<short-name>                  e.g. docs/architecture-map
chore/<short-name>                 e.g. chore/ci-cache
```

Branch from `main`. Keep one purpose per branch.

## Commit messages

Conventional Commits, lowercase, imperative:

```
feat(tasks): add assignee to task model
fix(auth): rotate refresh cookie on refresh
docs: explain the dependency rule
```

## Pull requests

- Open a **draft PR** when you start; mark it ready when CI is green.
- Fill in the PR template honestly — "How was this verified?" is the most
  important field.
- Keep PRs under ~400 changed lines where possible.
- At least one approval (CODEOWNERS is notified automatically) and a green
  CI are required before merge.

## Code rules that reviewers will check

1. **Business logic in services** — routers stay thin; components stay dumb.
2. **Data access in repositories** — no SQLAlchemy queries outside `app/repositories/`.
3. **HTTP through `apiFetch`** — no raw `fetch` in React components.
4. **Server state in TanStack Query; client state in Zustand.**
5. **Tests accompany behavior changes** — see the PR template checklist.
6. **No secrets, ever** — report vulnerabilities via a security advisory
   instead of an issue.

## License

By contributing, you agree your contributions are distributed under the MIT
License.
