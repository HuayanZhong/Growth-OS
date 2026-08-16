# @growth-os/* — Agent Guide

Package-level rules for the shared libraries under `packages/`. Every rule cites its why; follow the rule even when the why seems remote — the why records the decision, the rule is the executable part.

## Dependency direction

- **`shared` and `types` are leaves.** They depend on nothing beyond `zod`; never add a package dependency to them without a written reason. *Why:* they are consumed by both `apps/server` and `apps/desktop`, so a new dependency ripples to every consumer (topology: [docs/architecture.md](../docs/architecture.md)).
- **No package may depend on an app; no cycles.** The graph is a DAG with apps as sinks. *Why:* a cycle breaks pnpm's topological install order and Turborepo task scheduling.
- **`desktop-core` consumes its IPC contract from `types`, never inline.** *Why:* one home for channel names keeps preload and renderer in sync ([types/AGENTS.md](types/AGENTS.md)).

## Change discipline

- **One contract per package.** A package's `README.md`/`AGENTS.md` is its contract; changing public exports without updating the README is an incomplete change. *Why:* documentation rule — one fact, one home ([docs/AGENTS.md](../docs/AGENTS.md)).
- **Cross-package changes update every consumer in the same change** (an IPC channel in `types` touches `desktop-core` and `apps/desktop`) and ship an Agent Note. *Why:* repo rule — every non-trivial change ships a note ([AGENTS.md](../AGENTS.md)).
- **Catalogs, not inline versions.** Add or bump dependencies via `catalog:*` in `pnpm-workspace.yaml`. *Why:* single-version truth; inline versions drift silently.
- **Verify at the right scope.** Package-local changes run the package script; cross-package changes run the repo suite (`pnpm test` → `typecheck` → `lint`). *Why:* test rule — verification order is test → typecheck → lint (`.trae/rules/frontend/tests/commands.md`).

## Layout

- Barrel export at `src/index.ts` for every package except `desktop-core`, whose entry is the compiled `dist/main.js`.
- Shared config only: lint/format/typecheck come from `tooling/`; do not add per-package overrides without a reason. *Why:* one config set keeps the repo verifiable with a single command.
