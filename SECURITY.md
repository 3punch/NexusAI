# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security findings.**

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/3punch/NexusAI/security/advisories/new)
("Report a vulnerability" button). You will get a response within a few days.

Please include:

- what the vulnerability is and how to reproduce it
- which component is affected (backend `/api/v1/...`, frontend, docs, CI)
- your assessment of severity (critical/high/medium/low)

## What is in scope

- authentication and session handling (JWT access/refresh, cookie flags)
- tenancy / workspace isolation (cross-workspace access)
- governed-action integrity (self-approval, ledger bypass)
- injection, XSS, CSRF, SSRF, secrets handling
- dependency vulnerabilities

## Out of scope

- findings requiring a compromised machine or MITM on localhost
- the demo accounts (`alice@example.com` / `bob@example.com`) — they are
  seeded dev data on SQLite, not credentials
- brute force on rate-unlimited endpoints that are documented as future work
  (see the improvement backlog in `docs/ARCHITECTURE_COMPARISON.md`)

## Safe harbor

We consider good-faith research valuable and will not pursue action against
anyone who reports a finding under this policy, avoids privacy violations or
service degradation, and gives us reasonable time to respond before public
disclosure.

## Known limitations (documented, not secrets)

- refresh tokens are cookie-TTL-bound; there is no revocation/logout endpoint
  yet (issue backlog, first priority)
- `/assistant/ask` has no rate limiting yet (mock provider in dev; wire a
  limit before connecting a real one)
- dev uses SQLite; production deployments should use PostgreSQL

These are tracked as issues. Reporting one of them again is still welcome —
duplicates cost nothing.
