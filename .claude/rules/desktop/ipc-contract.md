---
alwaysApply: false
description: Desktop IPC contract (Electron + packages/types): channels only via the IpcChannelMap map; sensitive data via the secureStore channel; launchEnv is non-secret NUXT_PUBLIC_* only. Use when changing IPC channels, secure storage, or launch env.
---

# Desktop IPC Contract (Electron)

**Single source of truth**: `IpcChannelMap` in `packages/types/src/utils/ipc-channels.ts`. Adding a channel means adding one map entry — main (`handleIpc`), preload (`invokeIpc`), and the renderer-facing `DesktopAPI` type all derive from it at compile time. Never register `ipcMain.handle` / `ipcRenderer.invoke` outside the map; a channel missing from the map fails typecheck, and typecheck is the sync mechanism (no grep-based gate duplicates it).

**Sensitive data**: persist through the `secureStore` channel (main-process safeStorage: DPAPI / Keychain / libsecret). Tokens and credentials never live in localStorage or render-process state.

**Launch env injection**: `launchEnv` carries only the non-secret `NUXT_PUBLIC_*` whitelist (`LaunchEnvKey`). Secrets never transit `launchEnv` in either direction.

**Naming**: camelCase map keys; the key doubles as the IPC channel name and the `window.desktop` method name.

Verify: `pnpm typecheck` (three ends stay in sync at compile time).
