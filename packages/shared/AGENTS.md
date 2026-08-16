# @growth-os/shared — Agent Guide

Package contract: cross-package env/normalize utilities.

- **Keep it lean.** This package stays dependency-free beyond `zod`; add a dependency only when stdlib cannot do the job, and explain why.
- **Behavior is shared.** Both `apps/server` and `apps/desktop` import this package; a change here is a cross-layer change — run the repo verification suite (`pnpm test` → `typecheck` → `lint`) and follow the Agent Note rule from the root [AGENTS.md](../../AGENTS.md).
- **One fact, one home.** Put generic utilities here, not package-specific ones; package-specific helpers belong in the consuming package.
