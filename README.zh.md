# Growth OS

[English](README.md) | 中文

Growth OS 是仿 Coze 的 AI 智能体全栈桌面应用。基于 Turborepo Monorepo：桌面端 Nuxt 4 + Vue 3 + Electron，后端 NestJS + MikroORM，认证与数据库使用 Supabase。

## 运行

需要 Node.js >= 24（pnpm 由 Corepack 安装）。

```sh
git clone git@github.com:HuayanZhong/Growth-OS.git
cd Growth-OS
corepack enable
pnpm install
```

启动桌面端（Nuxt + Electron）：

```sh
cd apps/desktop
pnpm dev
```

Electron 窗口加载 `http://localhost:3000` 的 Nuxt dev server。

> **Electron 二进制下载**：首次安装下载慢或被阻断时，在 `.npmrc` 中取消注释 `electron_mirror=https://npmmirror.com/mirrors/electron/`，然后重新执行 `pnpm install`。

## 开发

- [architecture.zh.md](docs/architecture.zh.md) — 架构地图（中文镜像）；改 `packages/` 前先读
- [guide-zh.md](docs/guide-zh.md) — 中文导航索引
- [AGENTS.md](AGENTS.md) — agent 指南（英文：规则、命令、约定）

英文权威文档见 [architecture.md](docs/architecture.md)。
