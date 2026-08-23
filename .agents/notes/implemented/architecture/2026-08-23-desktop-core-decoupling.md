# Agent Note: desktop-core decoupling

Status: implemented

## Problem

`packages/desktop-core/src/main.ts` (295 lines) mixed three concerns — window creation, app lifecycle, and IPC handlers — and `src/preload.ts` held the bridge implementation. The main-process side grew hard to navigate and every IPC/updater change touched one monolith.

## Decision/Proposal

Split the package into three top-level modules under `packages/desktop-core/`, each a plain directory (not a workspace package):

- `bootstrap/` — window creation (`window.ts`) and app lifecycle: `whenReady`, global error handlers, `render-process-gone` crash threshold, `window-all-closed`.
- `ipc/` — typed `handleIpc` wrapper (`handle.ts`) + channel implementations: `secureStore` (`secure-store.ts`), the autoUpdater state machine and `checkForUpdates` / `quitAndInstall` / startup check (`updates.ts`); `index.ts` exposes `registerIpc()`.
- `preload/` — typed `invokeIpc` + the `DesktopAPI` implementation + `contextBridge.exposeInMainWorld`; exports `api` so the entry can re-export it.

`src/main.ts` and `src/preload.ts` remain the vite-plugin-electron entry points (thin: `registerIpc()` + `bootstrap()`; `export { api } from '../preload/index.ts'`), so `apps/desktop/modules/electron.ts` and `start:prod` need no change. The `autoUpdater` state stays private to `ipc/updates.ts`; `bootstrap` calls the exported `checkForUpdatesOnStartup()`.

## Alternatives considered

- **Three independent workspace packages** (`packages/desktop-core/{bootstrap,ipc,preload}` each with `package.json`) — rejected: `pnpm-workspace.yaml` globs `packages/*` one level deep, so they would need new globs, per-package tsconfigs, and a main entry that aggregates two packages; the build (`apps/desktop/modules/electron.ts`) and consumers would need path churn for zero runtime gain.
- **`src/` subdirectories** (`src/bootstrap/` etc.) — rejected: keeps every concern under `src/` but buries the module boundaries and contradicts the requested top-level layout.
- **Side-effect-only import for the preload entry** (`import '../preload/index.ts'`) — rejected: oxlint `no-unassigned-import` warns; re-exporting the `api` object keeps lint clean while the module side effect still runs `contextBridge.exposeInMainWorld`.

## Consequences

- `tsconfig.json` now includes `bootstrap/**`, `ipc/**`, `preload/**`; `rootDir` was removed (no tsc emit — bundling is vite's job).
- `electron-builder.yml` `files` excludes the three source dirs alongside `!src/**/*`.
- Runtime behavior is unchanged: `dist/main.js` bundles all modules, `dist/preload.cjs` exposes `window.desktop`; `pnpm build` (desktop) produces both, `pnpm test` (77), `pnpm typecheck`, `pnpm lint`, and `pnpm verify:docs` all pass.
- Docs moved with behavior: package `AGENTS.md` and bilingual READMEs describe the new layout.
