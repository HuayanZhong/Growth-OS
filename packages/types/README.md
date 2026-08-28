# @growth-os/types

English | [中文](README.zh.md)

Repo-wide type distribution: shared zod schemas, business types, and the typed IPC channel contract.

## Exports

| Module                      | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `src/auth.ts`               | Auth-related shared types/schemas                           |
| `src/utils/ipc-channels.ts` | Typed IPC channel contract between desktop and desktop-core |
| `src/index.ts`              | Barrel export                                               |

## Contract

- The IPC channel contract is authoritative here — `packages/desktop-core` and `apps/desktop` both consume it; changing a channel is a cross-package change that must update all consumers in the same change.
- Types only, no runtime logic.

## Known limitations

- The IPC contract currently covers the `desktop` ⇄ `desktop-core` pair only; server-side channels are not modeled here.
