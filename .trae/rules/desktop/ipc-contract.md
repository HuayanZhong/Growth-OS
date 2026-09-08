---
alwaysApply: false
description: Desktop IPC contract rule (Electron + packages/types): add channels only via the IpcChannelMap type map — one entry fans out to main (handleIpc), preload (invokeIpc), and window.desktop (DesktopAPI) at compile time; sensitive data persists through the secureStore channel (OS-level safeStorage); launchEnv carries only non-secret NUXT_PUBLIC_* variables. Use when adding or changing IPC channels, secure storage, or launch env injection.
---

# Desktop IPC Contract (Electron)

**Single source of truth**: `IpcChannelMap` in `packages/types/src/utils/ipc-channels.ts`. Adding a channel means adding one map entry — main (`handleIpc`), preload (`invokeIpc`), and the renderer-facing `DesktopAPI` type all derive from it at compile time. Never register `ipcMain.handle` / `ipcRenderer.invoke` outside the map; a channel missing from the map fails typecheck, and typecheck is the sync mechanism (no grep-based gate duplicates it).

**Sensitive data**: persist through the `secureStore` channel (main-process safeStorage: DPAPI / Keychain / libsecret). Tokens and credentials never live in localStorage or render-process state.

**Launch env injection**: `launchEnv` carries only the non-secret `NUXT_PUBLIC_*` whitelist (`LaunchEnvKey`). Secrets never transit `launchEnv` in either direction.

**Naming**: camelCase map keys; the key doubles as the IPC channel name and the `window.desktop` method name.

Verify: `pnpm typecheck` (three ends stay in sync at compile time).
