# Growth OS

English | [中文](README.zh.md)

Growth OS is a full-stack desktop application modeled after Coze, an AI agent platform. It is built on a Turborepo monorepo: Nuxt 4 + Vue 3 + Electron for the desktop client, NestJS + MikroORM for the backend, and Supabase for authentication and database.

## Run

Requires Node.js >= 24 (pnpm installed via Corepack).

```sh
git clone git@github.com:HuayanZhong/Growth-OS.git
cd Growth-OS
corepack enable
pnpm install
```

Start the desktop app (Nuxt + Electron):

```sh
cd apps/desktop
pnpm dev
```

The Electron window loads the Nuxt dev server at `http://localhost:3000`.

> **Electron binary download**: if the first install is slow or blocked, enable the China mirror by uncommenting `electron_mirror=https://npmmirror.com/mirrors/electron/` in `.npmrc`, then run `pnpm install` again.

## Development

- [architecture.md](docs/architecture.md) — architecture map; read before touching `packages/`
- [AGENTS.md](AGENTS.md) — agent guide (rules, commands, conventions)

For Chinese readers: [guide-zh.md](docs/guide-zh.md) (navigation index) and [architecture.zh.md](docs/architecture.zh.md) (architecture mirror).
