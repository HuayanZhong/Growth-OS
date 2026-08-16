# apps — Agent Guide

Application-layer rules for the runnable apps under `apps/`.

- **One direction only.** Apps depend on `packages/*` and `tooling/`; no package may depend on an app, and `desktop` / `server` never depend on each other (topology: [docs/architecture.md](../docs/architecture.md)).
- **App contracts live in each app.** [desktop/AGENTS.md](desktop/AGENTS.md) and [server/AGENTS.md](server/AGENTS.md) are the per-app rules; the root [AGENTS.md](../AGENTS.md) is the repo contract.
- **Env is single-sourced.** All env vars live in the root `.env`; apps read them via the dotenv-cli cascade, never via their own `.env` files.
- **READMEs move with behavior.** An app's README is part of its contract; behavior changes update the README (bilingual) in the same change.
- **Verify at the right scope.** Per-app scripts first (`--filter desktop test`, `--filter server typecheck`); cross-layer changes run the repo suite (`pnpm test` → `typecheck` → `lint`).
