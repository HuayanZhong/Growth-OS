# @growth-os/desktop-core

[English](README.md) | 中文

桌面端核心模块。提供 Electron 主进程（窗口创建、IPC、preload）源码，由 `vite-plugin-electron` 负责编译和运行时管理。

## 架构

```
apps/desktop/nuxt.config.ts
  └── vite.plugins: [electron({...})]   ← vite-plugin-electron
       ├── 构建 desktop-core 的 main.ts / preload.ts
       ├── 启动 Electron 进程
       └── 改动主进程代码 → 自动重启 Electron

packages/desktop-core/
  ├── bootstrap/     ← 窗口创建、应用生命周期、全局错误处理
  ├── ipc/           ← IPC handler 注册与各通道实现
  ├── preload/       ← preload 实现（类型化 invoke + contextBridge 桥接）
  └── src/           ← 薄入口 + 共享类型
      ├── main.ts    ← Electron 主进程入口（装配 ipc + bootstrap）
      ├── preload.ts ← preload 入口（引入 ../preload）
      └── types.ts   ← window.desktop 全局类型声明
```

## 快速开始

```bash
# 进入 Nuxt 项目，一条命令启动所有
cd apps/desktop
pnpm dev
```

上述命令会：

1. 启动 Nuxt dev server
2. `vite-plugin-electron` 自动编译 `main.ts` 和 `preload.ts`
3. 自动启动 Electron 窗口，加载 Nuxt 页面
4. 改动主进程代码 → 自动重启 Electron

### 单独启动

```bash
# 仅启动 Nuxt（浏览器调试，不启动 Electron）
cd apps/desktop
npx nuxt dev

# 仅编译 desktop-core（验证类型）
cd packages/desktop-core
pnpm dev
```

## 前提条件

- **Node.js** >= 20.19（详见根目录 `.node-version`）
- **pnpm** >= 12（启用 corepack 后自动管理）
- **Windows / macOS / Linux**（Electron 跨平台支持）

### Electron 二进制下载

首次 `pnpm install` 时会自动下载 Electron 二进制文件（~150MB）。国内网络不佳时，可在 `.npmrc` 中取消注释镜像配置：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

## 项目结构

```
packages/desktop-core/
├── bootstrap/        # 窗口创建、应用生命周期、全局错误处理
├── ipc/              # IPC handler 注册与各通道实现（version/secureStore/updates）
├── preload/          # preload 实现：类型化 invoke + contextBridge 桥接
├── src/
│   ├── main.ts       # 主进程入口（薄：装配 ipc + bootstrap）
│   ├── preload.ts    # preload 入口（薄：引入 ../preload）
│   └── types.ts      # window.desktop 全局类型声明
├── dist/             # 编译产物（vite-plugin-electron 产出）
│   ├── main.js
│   └── preload.cjs
├── electron-builder.yml
├── tsconfig.json
└── package.json
```

## 技术栈

| 组件     | 技术           |
| -------- | -------------- |
| 桌面壳   | Electron 43    |
| 前端     | Nuxt 4 + Vue 3 |
| 语言     | TypeScript     |
| 构建编排 | Turborepo      |
| 包管理   | pnpm workspace |
