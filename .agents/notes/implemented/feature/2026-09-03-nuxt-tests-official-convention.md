# Agent Note: Nuxt tests follow the official projects layout

Status: implemented

## Problem

The repo-wide mirror convention (`test/` mirrors the source root one-to-one) was applied to `apps/desktop`, and the first correction attempt replaced it with type-grouped directories plus `.nuxt.` file-name environment opt-in. Both deviate from what the Nuxt 4.x testing docs actually prescribe ("组织你的测试"): an official projects setup where `test/unit/` holds node-environment pure-logic tests and `test/nuxt/` holds Nuxt-runtime tests, with the environment wired by Vitest projects (`defineVitestProject`) rather than file names. The user pointed at the docs and directed alignment with that layout.

## Decision

- `apps/desktop` tests use the official projects layout: `test/nuxt/` (flat, kebab-case) for the 12 Nuxt-runtime tests (SFC mounts, auto-imports, `mockNuxtImport`); `test/unit/` is reserved for genuinely standalone pure-logic tests (none today — composables here use auto-imports, so they are Nuxt-runtime tests). See `.trae/rules/frontend/tests/structure.md`.
- `vitest.config.ts` follows the official setup: `defineConfig` with two `test.projects` — `unit` (`test/unit/*.{test,spec}.ts`, `environment: 'node'`) and `nuxt` (`test/nuxt/*.{test,spec}.ts`, via awaited `defineVitestProject`). No global `environment: 'nuxt'`, no `.nuxt.` name infix — the directory decides the environment.
- `nuxt.config.ts` carries no manual `typescript.tsConfig.include`: `test/nuxt/` is auto-included in Nuxt's TypeScript context per the docs. Adding `test/unit/` alias support later is a manual, opt-in step if standalone unit tests need to import from `~/`.
- The root `.env` injection preamble in `vitest.config.ts` stays for now (monorepo-root env, CI placeholder fallback); the official `.env.test` mechanism is a possible later simplification.
- The mirror convention stays authoritative for `packages/*` and `apps/server` ([2026-09-02-mirror-test-directories.md](2026-09-02-mirror-test-directories.md)).

## Alternatives considered

- Keep the mirror (`test/app/**`) with a global `environment: 'nuxt'`: rejected per user direction — it invents a structure with no basis in the framework's tooling and hides which tests boot Nuxt.
- Type-grouped directories (`test/composables/`, `test/components/`, …) with `.nuxt.` file-name opt-in: rejected — closer to the docs' helper examples but still not the canonical layout; the docs' projects setup decides environment by directory, and scattered type folders split the Nuxt TypeScript context away from where the docs expect it.

## Consequences

A test's directory states its environment: `test/nuxt/` boots the Nuxt runtime and gets aliases/auto-import types for free; `test/unit/` runs fast in node but must stay free of Nuxt runtime features. Single projects run via `--project nuxt` / `--project unit`.
