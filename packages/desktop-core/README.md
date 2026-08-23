# @growth-os/desktop-core

English | [中文](README.zh.md)

Desktop core module: the Electron main process and preload sources (window creation, IPC, secure bridge), compiled and managed at runtime by `vite-plugin-electron`.

## Architecture

```
apps/desktop/nuxt.config.ts
  └── vite.plugins: [electron({...})]   ← vite-plugin-electron
       ├── builds desktop-core main.ts / preload.ts
       ├── starts the Electron process
       └── restarts Electron on main-process changes

packages/desktop-core/
  ├── bootstrap/     ← window creation, app lifecycle, global error handling
  ├── ipc/           ← IPC handler registration + channel implementations
  ├── preload/       ← preload implementation (typed invoke + contextBridge bridge)
  └── src/           ← thin entries + shared types
      ├── main.ts    ← Electron main process entry (assembles ipc + bootstrap)
      ├── preload.ts ← preload entry (imports ../preload)
      └── types.ts   ← global window.desktop type declaration
```

## Quick start

```bash
# From the Nuxt app — one command starts everything
cd apps/desktop
pnpm dev
```

This command:

1. Starts the Nuxt dev server
2. Compiles `main.ts` and `preload.ts` via `vite-plugin-electron`
3. Opens the Electron window loading the Nuxt page
4. Restarts Electron automatically when main-process code changes

### Standalone

```bash
# Nuxt only (browser debugging, no Electron)
cd apps/desktop
npx nuxt dev

# Compile desktop-core only (type check)
cd packages/desktop-core
pnpm dev
```

## Prerequisites

- **Node.js** >= 20.19 (see `.node-version` in the repo root)
- **pnpm** >= 12 (managed via Corepack)
- **Windows / macOS / Linux** (Electron is cross-platform)

### Electron binary download

The first `pnpm install` downloads the Electron binary (~150MB). On slow or blocked networks, enable the mirror in `.npmrc`:

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

## Project structure

```
packages/desktop-core/
├── bootstrap/        # window creation, app lifecycle, global error handling
├── ipc/              # IPC handler registration + channel implementations (version/secureStore/updates)
├── preload/          # preload implementation: typed invoke + contextBridge bridge
├── src/
│   ├── main.ts       # main process entry (thin: assembles ipc + bootstrap)
│   ├── preload.ts    # preload entry (thin: imports ../preload)
│   └── types.ts      # global window.desktop type declaration
├── dist/             # build output (produced by vite-plugin-electron)
│   ├── main.js
│   └── preload.cjs
├── electron-builder.yml
├── tsconfig.json
└── package.json
```

## Tech stack

| Component       | Tech           |
| --------------- | -------------- |
| Desktop shell   | Electron 43    |
| Frontend        | Nuxt 4 + Vue 3 |
| Language        | TypeScript     |
| Orchestration   | Turborepo      |
| Package manager | pnpm workspace |
