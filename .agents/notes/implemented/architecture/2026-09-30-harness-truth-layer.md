# Harness Truth Layer (.agents) — 2026-09-30

## Problem

Rules/agents/skills/MCP were duplicated across `.trae/`, `.claude/`, `.agents/` with diverging copies (observed: openspec skills drifted between `.claude/skills` and `.agents/skills`). Claude Code had no rules/agents/hooks/MCP ecosystem at all. Repository `core.symlinks=false`, so git dereferences symlinks into content copies — symlink-based sharing cannot be the source of truth.

## Decision

- `.agents/{rules,agents,skills}` + root `.mcp.json` are the single truth; `.trae/` and `.claude/` views are materialized by `scripts/sync-harness.cjs` (copy + prune + `--check` gate in `verify:gates`).
- Rule frontmatter is a superset: `alwaysApply`/`description`/`globs` (Trae) + `paths` (Claude Code lazy-load) — both platforms load on demand.
- Hooks truth is `.claude/settings.json` (Trae officially merges hooks from it); `.trae/hooks.json` retired to prevent double execution.
- Agent `tools` drop `run_mcp` (unofficial on both platforms; Claude Code fails subagent launch on unknown tool names).
- Guard hook validates writes to `.agents/**` truth and blocks writes to generated views.
- Sync never prunes a view whose truth side does not exist yet (guards against pre-migration data loss; bit us once on first run).

## Consequences

- Editing truth without syncing is caught by `verify:gates` (red) and auto-healed by the PostToolUse hook.
- Trae's `type` tolerance in `.trae/mcp.json` is undocumented; fallback is `STRIP_DEFAULT = true` in `sync-harness.cjs`.
- ~50 repo references to `.trae/rules/**` remain valid — view paths still exist physically.
- Vendored/generated skill assets are excluded from lint-staged via `VENDORED_PREFIXES` (`.claude/` added alongside `.agents/`, `.trae/`).
