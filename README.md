# NexusAI

**An AI-powered team hub:** workspaces, tasks, an AI assistant grounded in your
project data, and governed actions that require a second person's approval
before anything destructive happens.

NexusAI is a deliberately small but **production-shaped** full-stack
application: React + TypeScript frontend, FastAPI backend, layered
architecture, real authentication, database migrations, and CI from day one.

## Quick start

### Option A — Docker (one command)

```bash
docker compose up --build
# frontend: http://localhost:5173   API docs: http://localhost:8000/docs
```

### Option B — two terminals (development)

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows (source .venv/bin/activate on Unix)
pip install -r requirements-dev.txt
alembic upgrade head              # create/upgrade the database schema
uvicorn app.main:app --reload     # API on http://localhost:8000
```

> Migrations are a deliberate, explicit step — the app never silently
> mutates its own schema. In Docker, the entrypoint runs
> `alembic upgrade head` before starting the server.

Frontend:

```bash
cd frontend
npm install
npm run dev                       # UI on http://localhost:5173 (proxies /api)
```

Open http://localhost:5173, create an account, and you are in your personal
workspace. Registering a second account is how you experience the governed
actions flow (one proposes a deletion, the other approves it).

## Tests & checks

```bash
# backend (from backend/)
pytest
ruff check .

# frontend (from frontend/)
npm run build      # type-checks with tsc, then builds
npm test
```

## Documentation

| Document | Read it to learn... |
|---|---|
| [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) | every layer and folder: why it exists, what belongs, what must never go there |
| [`docs/REQUEST_FLOW.md`](docs/REQUEST_FLOW.md) | how a click becomes a database row and back — full traces with diagrams |
| [`docs/ARCHITECTURE_COMPARISON.md`](docs/ARCHITECTURE_COMPARISON.md) | which ForgeFlow-AI ideas we adopted, which we avoided, and why |
| [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md) | branching, pull requests, reviews, and merge policy |
| [`docs/PR_REVIEW_WALKTHROUGH.md`](docs/PR_REVIEW_WALKTHROUGH.md) | a worked review of a flawed PR — learn to review with confidence |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | the practical rules for your first PR |
| [`SECURITY.md`](SECURITY.md) | how to report vulnerabilities safely |

## The stack, and why

- **React + Vite + TypeScript** — explicit layering you can see in the code
- **FastAPI + SQLAlchemy 2 + Alembic** — router → service → repository
  separation, typed schemas, real migrations
- **SQLite in dev, PostgreSQL-ready in prod** — one `DATABASE_URL` change
- **TanStack Query + Zustand** — server state and client state, separated
- **GitHub Actions CI** — every PR is linted, tested, and built

## License

MIT.
