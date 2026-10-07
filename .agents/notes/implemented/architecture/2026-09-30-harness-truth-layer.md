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
- Rule frontmatter is trimmed per platform view (Trae: `alwaysApply`/`globs`; Claude Code: `paths` array) — verbatim superset copies fail VS Code Claude-extension schema validation and, earlier, comma-string `paths` failed CC validation entirely (must be a YAML array).

## Consequences

- Editing truth without syncing is caught by `verify:gates` (red) and auto-healed by the PostToolUse hook.
- Trae's `type` tolerance in `.trae/mcp.json` is undocumented; fallback is `STRIP_DEFAULT = true` in `sync-harness.cjs`.
- Active-file references were migrated to `.agents/rules/**` (10-08 sweep, incl. orphan-check fix in verify-docs); remaining `.trae/rules` mentions are deliberate (knip ignores, budget keys, hook fixtures, historical notes).
- Vendored/generated skill assets are excluded from lint-staged via `VENDORED_PREFIXES` (`.claude/` added alongside `.agents/`, `.trae/`).
