# Agent Note: Module graph + remaining cookbook paths (2.5)

Status: implemented

## Problem

Iteration plan 2.5 had two P1 items open: the module-graph generated catalog and the cookbook's "add a package / tool" paths. The architecture map's package topology was a hand-drawn ASCII diagram — and it had already drifted from reality (`apps/desktop` depends on `@growth-os/shared` in its package.json but the diagram omitted it; `desktop-core` is consumed via build integration, not a package dependency).

## Decision

- `scripts/generate-module-graph.cjs` renders `docs/module-graph.md` from the `apps/*`/`packages/*` package.json files — `@growth-os/*` entries split by runtime vs dev dependency, tables grouped by directory. Same pattern as the config catalog: pure exported render, CLI branch, freshness gate.
- verify-docs check #6 generalized to a `GENERATED_DOCS` list (`file` + `regen` command + render function) — adding a third generated doc is one array entry.
- The architecture map's ASCII topology (both pair sides) is replaced by a link to the generated graph plus the rules pointer to `packages/README.md` — one home per fact; the prose keeps only what the generator cannot express (roles, stability).
- Cookbook: `docs/cookbook/package.md` and `tool.md` (+ zh mirrors, paired and budgeted). Package path documents the source-first scaffold (no build step, `exports` → `src/index.ts`), the `catalog:`/`workspace:*` dependency rules, the bilingual README + `AGENTS.md`/`CLAUDE.md` requirements, and registration in the Hierarchy table + generated graph. Tool path documents the `.cjs`-because-root-is-ESM rule, the checker pattern (`fail()` + `exitCode`, never throw-first) vs generator pattern, the two paid-for TS 6 parsing lessons, and the wiring conventions (`verify:*`/`generate:*` scripts, extend `verify-docs` instead of adding husky hooks).

## Alternatives considered

- Keeping the ASCII diagram next to the generated graph: rejected — two homes for one fact, drift guaranteed (it had drifted already).
- Mermaid diagram instead of tables: deferred — the table is diff-stable and readable as plain text; a rendered graph can be added to the generator if a need appears.
- Covering NestJS server-module graphs in the generator: rejected for now — module wiring is visible in `app.module.ts`; no drift incident motivates the extra parser.

## Consequences

Adding/moving workspace dependencies now requires `pnpm generate:graph` + commit, or CI fails. The topology in the architecture map is no longer editable prose — edits go to package.json and the generator. 2.5's remaining scope is only the phase-3-deferred event mapping.
