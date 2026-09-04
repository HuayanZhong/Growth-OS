# Agent Note: Mirror test directory convention

Status: implemented

## Problem

Tests had three different homes: server co-located specs (`src/**/*.spec.ts`), desktop `test/unit` + `test/nuxt`, and shared packages' co-located `*.test.ts`. No rule said where a new test goes, and `packages/ui` / `packages/desktop-core` had no test story at all. The user mandated a single convention: tests live in a sibling `test/` tree mirroring the source tree, and every package must have tests.

## Decision

- Every `src/`-rooted package has a top-level `test/` directory, peer to `src/` (shared packages and the server), with one-to-one path mirroring: `src/a/b.ts` → `test/a/b.test.ts`; fixtures sit beside their tests in the mirrored location. The desktop app is exempt — it follows the official Nuxt test convention instead (see [the 2026-09-03 note](2026-09-03-nuxt-tests-official-convention.md)).
- Tool configs follow the convention: `tsconfig include` covers `test/**`, vitest `include` points at `test/**/*.test.ts`.
- Applied to `packages/shared` (env/normalize/session-events tests + typed fixture — typed TS fixtures instead of JSON imports keep `SessionEventType` discriminants type-checked), `packages/types` (auth schema test), and the server: its 10 co-located specs live under the mirrored `test/`. Desktop tests were reorganized to the official Nuxt convention in the same iteration ([2026-09-03-nuxt-tests-official-convention.md](2026-09-03-nuxt-tests-official-convention.md)). The matching `.trae/rules` tests/structure rules and the `AGENTS.md` command examples describe both layouts.
- `packages/desktop-core` runs vitest (catalog:test) with the mirrored layout (`test/ipc/secure-store.test.ts`): the `electron` module is mocked (`app.getPath` points at a real temp dir, `safeStorage` fakes reversible encryption), while node:fs/node:crypto stay real so the on-disk layout (`sha256(key).enc`) is exercised; cases cover get/set/remove, safeStorage-unavailable (no plaintext fallback), and error paths.

## Alternatives considered

- Keep server co-located specs (NestJS community convention): rejected per explicit user direction — a single repo-wide convention beats per-framework habit, and `src/` stays production-only.
- Keep desktop's `test/unit`/`test/nuxt` buckets: rejected for the same reason; the bucket names do not map to source paths, so a test's location no longer tells you which source it covers.

## Consequences

`pnpm test` runs all six packages — every package has tests, so the "every package must have tests" rule is checkable by `pnpm test` alone. In mirrored packages new tests go in the mirrored `test/` path; co-located tests are no longer acceptable. The desktop app follows the official Nuxt structure instead ([2026-09-03 note](2026-09-03-nuxt-tests-official-convention.md)).
