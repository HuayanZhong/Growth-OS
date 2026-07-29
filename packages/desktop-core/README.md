# @growth-os/desktop-core

桌面端核心模块。提供 Electron 窗口创建、IPC 通信等能力，由 Nuxt 模块接管运行时生命周期。

## 架构

```
apps/desktop (Nuxt)
  └── modules/electron.ts       ← 管理 Electron 进程生命周期
       └── 调用 desktop-core 编译产物
            ├── dist/main.js    ← Electron 主进程入口
            └── dist/preload.js ← 安全桥接层
```

Nuxt dev server 启动后，Electron 窗口加载 `localhost:3000`，前端享有 Vite HMR。

## 快速开始

```bash
# 1. 安装依赖（如果尚未执行）
pnpm install

# 2. 启动桌面端（Nuxt + Electron）
pnpm dev
```

上述命令会：

1. 启动 Nuxt dev server（端口 3000）
2. 编译 `packages/desktop-core` 的 TypeScript
3. 端口就绪后自动启动 Electron 窗口

### 单独启动

```bash
# 仅启动 Nuxt（浏览器调试）
pnpm --filter desktop dev

# 单独启动 Electron（需先确保 Nuxt 在 3000 端口运行）
pnpm --filter @growth-os/desktop-core dev
```

## 前提条件

- **Node.js** >= 20.19（详见根目录 `.node-version`）
- **pnpm** >= 11.17（启用 corepack 后自动管理）
- **Windows / macOS / Linux**（Electron 跨平台支持）

### Electron 二进制下载

首次 `pnpm install` 时会自动下载 Electron 二进制文件（~150MB）。国内网络不佳时，可在 `.npmrc` 中取消注释镜像配置：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

## 项目结构

```
packages/desktop-core/
├── src/
│   ├── main.ts       # Electron 主进程：窗口创建、IPC、生命周期
│   ├── preload.ts    # preload 脚本：contextBridge 安全桥接
│   └── launch.ts     # launch 函数：供 Nuxt Module 调用的进程管理
├── dist/             # TypeScript 编译产物
│   ├── main.js
│   └── preload.js
├── tsconfig.json
└── package.json
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| 前端 | Nuxt 4 + Vue 3 |
| 语言 | TypeScript |
| 构建编排 | Turborepo |
| 包管理 | pnpm workspace |
