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

packages/desktop-core/src/
  ├── main.ts        ← Electron main process entry
  ├── preload.ts     ← preload script (secure bridge layer)
  └── types.ts       ← shared types for main/preload
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
- **pnpm** >= 11.17 (managed via Corepack)
- **Windows / macOS / Linux** (Electron is cross-platform)

### Electron binary download

The first `pnpm install` downloads the Electron binary (~150MB). On slow or blocked networks, enable the mirror in `.npmrc`:

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

## Project structure

```
packages/desktop-core/
├── src/
│   ├── main.ts       # Electron main process: window creation, IPC, lifecycle
│   ├── preload.ts    # preload script: contextBridge secure bridge
│   └── types.ts      # shared types
├── dist/             # TypeScript build output
│   ├── main.js
│   └── preload.js
├── electron-builder.yml
├── tsconfig.json
└── package.json
```

## Tech stack

| Component | Tech |
| --- | --- |
| Desktop shell | Electron 43 |
| Frontend | Nuxt 4 + Vue 3 |
| Language | TypeScript |
| Orchestration | Turborepo |
| Package manager | pnpm workspace |
