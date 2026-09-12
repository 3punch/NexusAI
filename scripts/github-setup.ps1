# GitHub setup — run ONCE after `gh auth login`
#
#   gh auth login            # interactive: browser/device flow, choose GitHub.com + HTTPS
#   .\scripts\github-setup.ps1
#
# What it does: repo description + topics, issue labels, the collaboration
# backlog as labeled issues, and branch protection on main.
# Idempotent: re-running is safe (existing things are skipped, duplicates are
# harmless).

$ErrorActionPreference = 'Continue'
$repo = '3punch/NexusAI'

Write-Output "== auth check =="
gh auth status
if ($LASTEXITCODE -ne 0) { Write-Output 'NOT AUTHENTICATED — run: gh auth login'; exit 1 }

Write-Output "== repo description + topics =="
gh repo edit $repo --description "AI-powered team hub: workspaces, tasks, governed actions, assistant — React + TypeScript frontend, FastAPI layered backend" > $null
gh repo edit $repo --add-topic fastapi --add-topic react --add-topic typescript --add-topic sqlalchemy --add-topic tanstack-query --add-topic architecture > $null

Write-Output "== labels =="
foreach ($spec in @(
    'architecture;Touches layer boundaries;5b8cff',
    'security;Auth, tenancy, or secrets;e5484d',
    'docs;Documentation only;8b93a7',
    'needs-discussion;Open an issue before coding;f0b429'
)) {
    $p = $spec -split ';'
    gh label create $p[0] --description $p[1] --color $p[2] --repo $repo 2>&1 | Out-Null
}

Write-Output "== backlog issues =="
$backlog = @(
    @{ title = 'feat: logout endpoint that revokes refresh tokens'
       body  = "From docs/ARCHITECTURE_COMPARISON.md backlog (priority 1). Add POST /api/v1/auth/logout: clear the refresh cookie server-side and actively revoke the token (a token_version column or a denylist). Update use-bootstrap-auth + Layout to call it. Tests: logout clears cookie; revoked refresh token returns 401."
       label = 'security' }
    @{ title = 'feat: workspace roles (owner/member/admin)'
       body  = "Backlog (priority 2). Role-aware governance: approvals require member (already true) but new endpoints may require admin. Add role column to workspace_members + permission service. Router/service shapes unchanged."
       label = 'enhancement' }
    @{ title = 'feat: paginate tasks and actions lists'
       body  = "Backlog (priority 3). Keyset pagination in TaskRepository/ActionRepository before data grows; keep response shape additive (items + next_cursor)."
       label = 'enhancement' }
    @{ title = 'test: frontend component tests for critical flows'
       body  = "Backlog (priority 4). Testing Library + jsdom for LoginPage, TaskList optimistic update, ActionsPanel decisions. Config already supports jsdom (see vite.config.ts test.environment)."
       label = 'enhancement' }
    @{ title = 'feat: rate-limit POST /assistant/ask'
       body  = "Backlog (priority 5). MUST land before wiring a real LLM provider. Simple in-memory limiter in the router or a dependency; per-user, e.g. 10/min."
       label = 'security' }
    @{ title = 'feat: structured logging with request IDs'
       body  = "Backlog (priority 6). Request-ID middleware + JSON logs once debugging which-request-was-this becomes real. Touches core/logging only — one-file change by design."
       label = 'architecture' }
    @{ title = 'feat: show task titles on pending governed actions'
       body  = "The ideal first PR — see docs/PR_REVIEW_WALKTHROUGH.md section 6. Resolve titles in ActionsPanel from cached tasks + optimistic pending entry in use-actions. Frontend only."
       label = 'good first issue' }
)
foreach ($issue in $backlog) {
    gh issue create --title $issue.title --body $issue.body --label $issue.label --repo $repo > $null
    if ($LASTEXITCODE -eq 0) { Write-Output "  created: $($issue.title)" }
}

Write-Output "== branch protection on main =="
$protection = @{
    required_status_checks = @{
        strict   = $false
        contexts = @('backend', 'frontend')
    }
    enforce_admins                 = $false
    required_pull_request_reviews  = @{
        required_approving_review_count = 1
        dismiss_stale_reviews           = $true
    }
    restrictions                   = $null
    allow_force_pushes             = $false
    allow_deletions                = $false
} | ConvertTo-Json -Depth 5

Write-Output $protection | gh api -X PUT "repos/$repo/branches/main/protection" --input -
if ($LASTEXITCODE -eq 0) {
    Write-Output 'PROTECTED: main now requires green CI + 1 approval'
} else {
    Write-Output 'PROTECTION VIA CLI FAILED (job-name contexts can drift).'
    Write-Output 'Manual path (2 min): Settings > Branches > Add rule > main:'
    Write-Output '  - Require a pull request before merging (1 approval, dismiss stale)'
    Write-Output '  - Require status checks: backend, frontend'
    Write-Output '  - Block force pushes; Do not allow deletions'
}

Write-Output "== done =="
Write-Output "Open: https://github.com/$repo"
