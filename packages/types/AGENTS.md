# @growth-os/types — Agent Guide

Package contract: repo-wide shared types and the typed IPC channel contract.

- **Types only.** No runtime logic, no side effects.
- **IPC channels are authoritative here.** `src/utils/ipc-channels.ts` is consumed by both `packages/desktop-core` and `apps/desktop`; renaming or changing a channel is a cross-package change — search and update all consumers (see the search rules in the user guidelines) in the same change.
- **Schema changes** to `zod` types affect validation behavior at runtime in the consuming packages; treat them as behavior changes, not cosmetic edits.
