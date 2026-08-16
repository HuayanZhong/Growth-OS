# @growth-os/desktop-core — Agent Guide

Package contract: Electron main process + preload (`src/main.ts`, `src/preload.ts`, `src/types.ts`).

- **Keep the bridge minimal and secure.** Preload exposes only the typed `window.desktop` API via `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`); never widen the surface casually.
- **IPC channels are typed upstream.** Channel names/contracts live in `@growth-os/types` (`src/utils/ipc-channels.ts`); changing a channel updates this package and `apps/desktop` in the same change.
- **Architecture map.** Read [docs/architecture.md](../../docs/architecture.md) before changing this package; it is the bridge layer between Nuxt and Electron.
