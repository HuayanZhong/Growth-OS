# tooling — Shared configs

English | [中文](README.zh.md)

`tooling/` holds the repo's shared tool configs. It is not a package (no `package.json`); packages and apps consume it via `extends` and CLI flags. The TypeScript layout is documented in detail at [docs/architecture/typescript-config.md](../docs/architecture/typescript-config.md).

| Directory     | Config                                                           | Consumed by                                |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| `typescript/` | `base.json` + `runtime/{browser,node}.json` + `framework/*.json` | every package/app `tsconfig` via `extends` |
| `lint/`       | `.oxlintrc.json`                                                 | `pnpm lint`                                |
| `format/`     | `.oxfmtrc.json`                                                  | `pnpm format`                              |
| `test/`       | `base.ts` (Vitest helpers)                                       | per-app `vitest.config.ts`                 |

## Rules

- A change here is a cross-layer change: every consumer picks it up. Verify with the repo suite (`pnpm typecheck` / `lint` / `format`) and ship an Agent Note.
- Keep configs shared; a per-package override needs a written reason.

## Quality gates (repo root)

| Gate              | What it catches                                                    | Where configured                          |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| `pnpm hygiene`    | Dead code, unused deps/exports/files (knip) + invalid `exports` (publint) | `knip.json` + per-package `publint` script |
| `pnpm test:coverage` (per package) | Coverage via `@vitest/coverage-v8`; `include` scoped per package in each `vitest.config.ts` | per-package `vitest.config.ts` |

Framework-magic deps knip cannot see (CSS-referenced, string transports) are listed in `knip.json` `ignoreDependencies` with a reason — add yours there instead of deleting them.
