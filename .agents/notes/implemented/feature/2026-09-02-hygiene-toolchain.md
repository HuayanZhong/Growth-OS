# Agent Note: Hygiene toolchain (knip + publint)

Status: implemented

## Problem

Phase 1.3 of the iteration plan called for dead-code/unused-dependency detection and package-exports validation. The repo had neither, so dead deps (e.g. `class-validator` catalog entries) and an invalid `exports` target in `@growth-os/desktop-core` were invisible.

## Decision

- Single entry point `pnpm hygiene` = `knip && turbo run publint`. knip runs once over the whole pnpm workspace (root `knip.json` with per-workspace `entry`/`ignoreDependencies`; framework-invoked deps such as `daisyui`/`tailwindcss` in CSS, `vue-tsc` via `nuxt typecheck`, `pino-pretty` as a pino transport string, `tsx` as the MikroORM CLI TS runner are ignored with a reason, not deleted). publint runs per library package (`shared`/`types`/`ui`/`desktop-core`) as a turbo task so it parallelizes in the existing graph.
- CI runs `pnpm hygiene` as its own step after lint/typecheck/test.
- Findings fixed in the same change: removed `class-validator`, `class-transformer`, `@types/pg`, `vue-router` catalog entries/deps, root `vitest` devDep, and the never-imported `@growth-os/desktop-core` dependency from `apps/desktop`; deleted the orphaned `vitest.workspace.ts` (Vitest 4 removed workspace files) and updated tooling READMEs; declared the directly-imported `@nuxt/schema` in `apps/desktop`; removed the directory-valued `exports["."]` from `@growth-os/desktop-core` (invalid per Node exports spec, and no consumer imports the package specifier anymore); un-exported `E2EAppModule` (only used in-file).
- `SkipTimeout` and `DatabaseSeeder.ts` are intentional pre-usage/infra-referenced artifacts, silenced via per-file `ignoreIssues`, not deleted.

## Alternatives considered

- Per-package knip runs inside turbo (finer caching): rejected — knip's monorepo mode is one process over all workspaces; splitting it duplicates config and loses cross-workspace catalog reporting.
- Silence all findings via a broad `ignore` instead of removing deps: rejected — that defeats the tool; removals here are all verified by the repo suite.
- Keep `vitest.workspace.ts` with a knip ignore: rejected — Vitest 4 removed workspace-file support entirely, so the file cannot come back.

## Consequences

`pnpm hygiene` must stay green in CI; new unused deps/files fail the build. Framework-magic usages that knip cannot see must be added to `knip.json` `ignoreDependencies` with a comment, or they will surface as false positives.
