# Agent Note: UI package tests + repo coverage tooling

Status: implemented

## Problem

`packages/ui` had no tests at all (violating the mirror-test-directory convention's "every package must have tests"), and the repo had no coverage tooling, so the iteration plan's ">80% for shared packages" verification standard was unmeasurable.

## Decision

- `packages/ui` gets vitest + `@vue/test-utils` + happy-dom + `@vitejs/plugin-vue` (SFC compilation) with the mirrored layout: `test/lib/cn.test.ts`, `test/components/ui/theme-toggle/theme-toggle.test.ts`, `test/index.test.ts` (barrel smoke). 13 tests; ThemeToggle is mounted on happy-dom and asserts its daisyUI swap structure, default-unchecked state, and toggle behavior. Visual regression is deliberately not added: the package renders only inside the Electron shell with daisyUI themes, and no screenshot infrastructure exists — noted as a future item, not faked with unit tests.
- Coverage is institutionalized per package: `@vitest/coverage-v8` (catalog:test) + a `test:coverage` script in shared/types/ui/server/desktop, with `coverage.include` scoped inside each `vitest.config.ts` (`src/**` for packages, `app/**` for desktop, server excludes co-located `*.spec.ts`). `coverage/` is gitignored; artifacts must never be committed.
- `cn()` conditional-class test uses a runtime-typed variable instead of a literal `false && 'b'` — oxlint rejects constant truthiness expressions.

## Alternatives considered

- Testing ThemeToggle via DOM snapshot of rendered CSS (visual regression): rejected — swap show/hide is pure daisyUI CSS; asserting pixels without a browser screenshot harness would be theater.
- One root-level coverage aggregation script: rejected for now — five per-package runs are enough for review purposes; aggregate reporting can ride on turbo when a threshold gate is actually enforced in CI.

## Consequences

`pnpm test` runs all six packages. Coverage baselines captured in the 2026-09-03 review: shared 97%, types 100% on tested schema (pure-type files excluded naturally), ui 100% on shipped units, server 64.5%, desktop 58.2% after the chat component and session-replay tests, desktop-core 88.75% after the autoUpdater state machine tests (the preload bridge and main entry stay untested Electron host code) — server/desktop are the coverage debt targets, tracked as action items in the iteration plan.
