# Growth OS

仿 Coze 平台的全栈桌面应用，基于 Turborepo Monorepo 架构。

| 组件 | 技术 | 位置 |
|------|------|------|
| 桌面壳 | Electron + TypeScript | `packages/desktop-core` |
| 前端 | Nuxt 4 + Vue 3 + Vite | `apps/desktop` |
| 构建编排 | Turborepo | `turbo.json` |
| 包管理 | pnpm workspace | `pnpm-workspace.yaml` |
| 语言 | TypeScript（Monorepo 共享配置） | `tooling/typescript` |

## 前置要求

| 工具 | 版本 | 说明 |
|------|------|------|
| **Node.js** | >= 24 | 建议用 [`nvm`](https://github.com/coreybutler/nvm-windows) 或 [`fnm`](https://github.com/Schniz/fnm) 管理版本 |
| **pnpm** | 11.17.0 | 启用 Corepack 后自动安装：`corepack enable` |
| **Git** | 任意现代版本 | |

## 快速开始

### 1. 克隆项目

```bash
git clone git@github.com:HuayanZhong/Growth-OS.git
cd Growth-OS
```

### 2. 启用 Corepack（如未启用）

```bash
corepack enable
```

> Corepack 会根据根目录 `package.json` 的 `packageManager` 字段自动下载对应版本的 pnpm。

### 3. 安装依赖

```bash
pnpm install
```

依赖安装完成后：

- 所有 workspace 包之间的链接已建立
- 各包的 TypeScript 已配置完毕
- Electron 二进制文件会自动下载

> **关于 Electron 二进制下载**：首次安装时会自动下载 Electron 运行时（~150MB）。
> 如果下载慢或被阻断，可以启用国内镜像源：
>
> ```bash
> # 编辑 .npmrc，取消注释以下行：
> electron_mirror=https://npmmirror.com/mirrors/electron/
> ```
>
> 然后重新安装：
> ```bash
> pnpm install
> ```

### 4. 启动开发环境

```bash
# 启动桌面端（Nuxt + Electron）
pnpm dev
```

这条命令会：

1. 启动 Nuxt dev server（`http://localhost:3000`）
2. 编译 `desktop-core` TypeScript 代码
3. 等待端口就绪后自动弹出 Electron 窗口

你也可以单独启动各子项目：

```bash
# 仅启动 Nuxt（浏览器调试）
pnpm --filter desktop dev

# 单独启动 Electron（需先启动 Nuxt）
pnpm --filter @growth-os/desktop-core dev
```

## 项目结构

```
Growth OS/
├── apps/
│   └── desktop/              ← Nuxt 前端应用
│       ├── app/
│       │   └── app.vue       ← 入口组件
│       ├── modules/
│       │   └── electron.ts   ← Electron 生命周期管理模块
│       ├── nuxt.config.ts
│       └── package.json
│
├── packages/
│   └── desktop-core/         ← Electron 桌面核心模块
│       ├── src/
│       │   ├── main.ts       ← 主进程入口
│       │   ├── preload.ts    ← preload 脚本
│       │   └── launch.ts     ← 进程管理工具函数
│       ├── package.json
│       └── tsconfig.json
│
├── tooling/
│   └── typescript/           ← 共享 TypeScript 配置
│       ├── base.json         ← 语言规范
│       ├── runtime/
│       │   ├── browser.json  ← 浏览器环境
│       │   └── node.json     ← Node 环境
│       └── framework/
│           ├── vue.json
│           ├── react.json
│           └── ...
│
├── turbo.json                ← Turborepo 任务编排
├── pnpm-workspace.yaml       ← pnpm workspace 配置
├── .npmrc                    ← npm 配置（含 Electron 镜像）
└── package.json
```

## 技术栈

### 前端 & 桌面

| 技术 | 用途 |
|------|------|
| [Nuxt 4](https://nuxt.com/) | Vue 全栈框架 |
| [Vue 3](https://vuejs.org/) | 前端 UI 框架 |
| [Electron](https://www.electronjs.org/) | 桌面壳（Chromium + Node.js） |
| [Vite](https://vite.dev/) | 前端构建工具 |

### Monorepo

| 技术 | 用途 |
|------|------|
| [Turborepo](https://turbo.build/repo) | 构建编排与缓存 |
| [pnpm](https://pnpm.io/) | 包管理器 |
| [TypeScript](https://www.typescriptlang.org/) | 类型系统 |

## 常见问题

### 安装依赖时 Electron 下载失败

```bash
# 1. 启用国内镜像
# 编辑 .npmrc，取消注释 electron_mirror 行

# 2. 清除缓存并重装
pnpm store prune
pnpm install
```

### Electron 窗口空白 / 无法加载页面

确认 Nuxt dev server 正在 `http://localhost:3000` 运行。如果端口被占用，检查是否有其他进程在使用 3000 端口。

### 修改 Electron 主进程代码后没生效

主进程代码运行在单独的 Node.js 进程中，修改后 Electron 会自动重启。
