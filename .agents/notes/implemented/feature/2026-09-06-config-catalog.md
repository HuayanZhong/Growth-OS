# Agent Note: Generated config catalog with freshness gate (2.5)

Status: implemented

## Problem

Iteration plan 2.5 called for generated catalogs with a verify-docs freshness check. Config facts were drifting already: `.env.example` still described the pre-2.4 dotenv `-c` cascade after the `-e` chain rewrite, and the runtime env surface (shared `publicEnvSchema`, server `envSchema`, desktop launch allowlist) lived in three code files with no single view. The docs slop checklist explicitly prefers "a generator is authoritative" over hand-restated catalogs.

## Decision

- `scripts/generate-config-catalog.cjs` renders `docs/config-catalog.md` from three code sources via static TypeScript AST parsing (`ts.createSourceFile` — the same toolchain as the ts snippet gate, no runtime zod introspection): variable name, validation expression text, and the leading comment as the description column. The JSDoc stays the one home of each field's description; the generator copies it.
- Freshness is check #6 in `verify-docs.cjs`: it re-runs the generator in-process and fails on any byte difference with the committed file — catching both "schema changed without regenerating" and "hand-edited generated doc". `pnpm generate:config` is the regeneration entry.
- The catalog is English-only and deliberately not registered in `doc-pairs.manifest.json`: pairing is an opt-in list for hand-written docs; a generated file would drift one side instantly. `docs/guide-zh.md` links it from the index instead.
- The server section only lists the `extend({...})` block; the three `NUXT_PUBLIC_*` keys arrive via `publicEnvSchema.partial()` and are documented in the public section with a note that they are optional server-side. Build-time-only variables (`NUXT_APP_BASE_URL`, `CSC_*`, `GH_TOKEN`) stay out — `.env.example` remains their home, and the catalog links to it instead of restating it.
- Comments sit in a node's leading trivia: `ts.getLeadingCommentRanges` must be called with `getFullStart()`, not `getStart()` — with the latter the ranges are never found and every description silently renders as "—".

## Alternatives considered

- Runtime zod introspection (import the schemas, walk `.shape`): rejected — zod v4's introspection surface was unverified, and descriptions would need `.describe()` calls, duplicating the JSDoc facts.
- `node --experimental-strip-types` to import `.ts` schemas directly: rejected — resolution of workspace packages from `scripts/` depends on symlink topology; static parsing has zero runtime coupling.
- Extracting the desktop `nuxt.config.ts` runtimeConfig mapping too: rejected — the key mapping is exercised on every boot, its drift risk is low, and the nested-AST parsing cost outweighs it.
- Cross-checking `.env.example` against the schemas: deferred — no observed drift between them beyond the header comment, which was fixed in this change.

## Consequences

Adding a variable to any of the three sources now requires `pnpm generate:config` + committing the diff, or CI fails. The description column inherits source comments verbatim — comment edits must be regenerated the same way. A description can legitimately be "—" (e.g. `THROTTLE_LIMIT` shares the comment block above `THROTTLE_TTL_MS`); the catalog mirrors the source rather than inventing text.
