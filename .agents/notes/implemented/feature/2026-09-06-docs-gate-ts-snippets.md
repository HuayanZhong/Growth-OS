# Agent Note: Docs gate ts snippet compilation (2.5)

Status: implemented

## Problem

Iteration plan 2.5 flagged that ts code blocks in docs were never compiled — a doc could import `normalizeUrl` from `@growth-os/shared` and nothing would fail. That exact drift existed on day one: both `packages/shared/README.md` and `README.zh.md` imported a non-existent export (real exports: `normalizeBaseUrl` / `normalizePrefix` / `joinUrl`).

## Decision

- New check #5 in `scripts/verify-docs.cjs`: extract ` ```ts ` blocks from `packages/*/README*.md`, compile them against real workspace sources via the `typescript` API (`ts.createProgram` + `ts.getPreEmitDiagnostics`), fail the gate on any snippet-file diagnostic. Scope is deliberately narrow: package READMEs are the executable surface of "documented exports must exist". `.trae/`/`.agents/` (third-party skills/rules) and `docs/` (historical plans) stay out; the P1 generated-catalog work can extend the scope later.
- `@growth-os/*` resolves through an absolute forward-slash `paths` entry to `packages/*/src/index.ts` — independent of cwd, and `baseUrl` is not used (deprecated in TypeScript 6, which is what the root devDependency now resolves to).
- `.css` side-effect imports are stripped before compiling (style assets, not type contracts); the ui README's `import '@growth-os/ui/main.css'` is thus unchecked by tsc.
- Diagnostics located in resolved package sources are ignored — package sources are owned by `turbo typecheck`; the gate only judges the snippet itself. With `skipLibCheck` and `types: []` the program stays fast (~1s).

## Alternatives considered

- Compiling all 461 ts blocks repo-wide: rejected — `.trae`/`.agents` third-party docs and `docs/superpowers` historical plans would flood the gate with unowned failures.
- Spawning `tsc --noEmit` per block: rejected — slower and needs temp tsconfigs; the API keeps one program for all blocks.
- Also asserting the stripped `.css` paths exist on disk: dropped as speculative; the link/file checks can cover assets if a need appears.

## Consequences

- Drift between package README snippets and real exports now fails `pnpm verify:docs` (and the pre-commit docs gate) with a precise file/block/line and a "did you mean" hint.
- TS 6 API notes baked into the script: `getPreEmitDiagnostics` exists only as a standalone function (`program.getPreEmitDiagnostics()` is gone), and diagnostic `fileName`s are forward-slashed even on Windows — snippet-file filtering must normalize separators or bad code silently passes.
- The bilingual pair hashes for the two fixed shared READMEs were re-recorded in the same change.
