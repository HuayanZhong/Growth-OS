# @growth-os/* packages

English | [中文](README.zh.md)

The `packages/` directory holds the shared libraries of the monorepo. The authoritative topology and data flow live in [docs/architecture.md](../docs/architecture.md); this file records the package hierarchy, stability expectations, and dependency rules.

## Hierarchy

| Package | Role | Stability |
| --- | --- | --- |
| [shared](shared/README.md) | env/normalize utilities, zero deps (plus `zod`) | Internal — leaf, stable surface |
| [types](types/README.md) | shared zod schemas + typed IPC channel contract | Internal — leaf, stable surface |
| [ui](ui/README.md) | design-system components + styles (Tailwind v4 + daisyUI 5) | Internal — growing surface |
| [desktop-core](desktop-core/README.md) | Electron main process + preload | Internal — bridge, stable surface |

All packages are `Internal` today: no external consumers, released together with the repo. `Stable surface` means public exports are contract-reviewed and any change updates consumers in the same change; `growing surface` means the export list is still expanding (see [AGENTS.md](AGENTS.md)).

## Dependencies

The dependency graph is owned by [docs/architecture.md](../docs/architecture.md) (package topology). Rules that always hold:

- `shared` and `types` are leaves — nothing depends on them from below, they depend on nothing beyond `zod`.
- `ui` is consumed by apps only; never import an app from a package.
- `desktop-core` is consumed by `apps/desktop` only; its IPC contract comes from `types`, never declared inline.
- No cycles; no package → app dependencies.

## Conventions

- Every package is `"type": "module"` with a barrel export at `src/index.ts` (except `desktop-core`, whose entry is the compiled `dist/main.js`).
- Lint / format / typecheck run against the shared `tooling/` configs; package scripts (`pnpm --filter <pkg> typecheck` etc.) mirror the root suite.
- Dependencies use pnpm catalogs (`catalog:*`) declared in `pnpm-workspace.yaml`, never inline versions.

## Package READMEs

Each package ships a bilingual contract (`README.md` EN + `README.zh.md` ZH) plus `AGENTS.md` (package-specific agent rules) and `CLAUDE.md` (thin pointer) — see the table above. A package README covers purpose, exports, and rules; known limitations are listed where they exist.
