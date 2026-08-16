# Apps layer documentation

- **Date**: 2026-08-16
- **Type**: implemented (architecture)

## Status

Implemented.

## Context

The repo document system covered root, `docs/`, `packages/` (directory + per-package), and `tooling/`, but the `apps/` layer had no docs and `docs/` only carried a server detail doc.

## Decision

- Add `apps/` directory-level four-piece set (`README.md` bilingual + `AGENTS.md` + `CLAUDE.md`), mirroring the `packages/` layer: app table, dependency direction (apps → packages, never reverse; desktop/server never depend on each other), env single-sourcing, README-as-contract.
- Add `docs/desktop/architecture.md` (bilingual) as the desktop frontend & shell detail doc — same tier as `docs/server/database.md` — covering layers, Electron wiring, auth, IPC, styles, tests, verification.
- Wire both into the doc nav: `docs/AGENTS.md` tier taxonomy, `docs/guide-zh.md` index, root `AGENTS.md` Human docs, `docs/architecture.md` map link, and the bilingual-pair manifest.

## Rationale

Per-layer contracts make app behavior discoverable to agents the same way package contracts are; the desktop shell is the primary app and its mechanisms (auth/IPC/electron wiring) previously lived only in `.trae/rules` with no map entry. Symmetry with `packages/` keeps the doc model uniform.

## Alternatives considered

- Skip `apps/` docs entirely (apps are thin wrappers): rejected — the desktop app carries the most user-facing behavior in the repo.
- Single `docs/apps.md`: rejected — each app has distinct mechanisms and rules; per-app README + a shared directory doc matches the `packages/` model.
