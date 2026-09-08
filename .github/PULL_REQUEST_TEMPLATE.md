<!-- Keep PRs small and single-purpose: a reviewer should understand this PR
     in under 15 minutes. If they can't, split it. -->

## What does this PR change?

<!-- One or two sentences: what behavior changes, for whom? -->

## Why?

<!-- Link the issue ("Closes #123") or explain the motivation. -->

## How was this verified?

- [ ] Backend tests added/updated (`pytest`)
- [ ] Frontend tests added/updated (`npm test`)
- [ ] Manually verified (describe what you clicked and what happened)

## Architecture checklist

- [ ] Business logic lives in a **service**, not in routers or components
- [ ] All data access goes through a **repository** (no queries elsewhere)
- [ ] New HTTP endpoints follow the domain-error mapping (`api/errors.py`)
- [ ] Frontend API calls go through `apiFetch` (no raw `fetch` in components)
- [ ] Server state uses TanStack Query; Zustand only holds client state
- [ ] Secrets stay out of the repo (`.env` never committed)
- [ ] Docs updated if architecture or setup changed (`docs/`)

## Screenshots (if UI changed)

<!-- Before/after images. -->
