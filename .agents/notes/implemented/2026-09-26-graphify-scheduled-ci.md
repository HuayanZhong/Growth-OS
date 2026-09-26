# Agent Note: graphify-out scheduled CI rebuild (daily 08:00 CST)

Status: implemented

## Problem

`graphify-out/` is a git-ignored local artifact, so it stays fresh only when a local agent remembers to run `graphify update .` after significant changes. Sessions that skip the refresh consult a stale graph, and nothing catches the gap when nobody runs it.

## Decision

[.github/workflows/graphify.yml](../../.github/workflows/graphify.yml) rebuilds the graph daily at 08:00 Beijing time (`cron: '0 0 * * *'` UTC; GitHub cron may drift by minutes):

- `pip install graphifyy==0.9.61` — same version as local, so the AST cache format stays compatible across incremental updates.
- `actions/cache` persists `graphify-out/` between runs: cache hit → `graphify update .` re-extracts only changed files (pure AST, no LLM, no API key); cache miss → cold full rebuild via `graphify extract . --code-only`.
- `graphify check-update .` reports pending semantic (doc) re-extraction without failing the job — CI deliberately runs no LLM extraction.
- Outputs (`graph.json`, `GRAPH_REPORT.md`, `*.html`) upload as the `graphify-out` workflow artifact; the repo itself stays untouched (`permissions: contents: read`).

`workflow_dispatch` exists so the first run can be verified immediately after merge instead of waiting for the schedule.

## Alternatives considered

- **Commit `graphify-out/` back to main (`git add -f`)** — rejected: contradicts the git-ignored convention in AGENTS.md, requires a write token on main, and bloats every clone with regenerable artifacts.
- **Publish to GitHub Pages** — rejected for now: needs a paid plan on private repos and turns a dev artifact into a deployment surface; revisit if browsing the graph outside Actions becomes a real need.
- **git-hook rebuild (`graphify hook install`)** — rejected: rebuilds on every developer commit and slows local commits; the graph does not need per-commit freshness.

## Consequences

- CI keeps only the code/AST layer fresh; the doc/semantic layer updates wherever an LLM is available (local agent). After heavy doc changes, run a semantic refresh locally — `check-update` in CI surfaces the gap.
- If a code deletion makes the incremental update refuse to shrink `graph.json` (shrink-guard), the job fails visibly; the fix is a forced rebuild (`graphify update . --force`) locally or via a dispatch run.
- The cache key is per-SHA, so old caches age out through GitHub's cache eviction; artifacts follow default retention (90 days).
