# Desktop — 前端与桌面壳

English | [中文](architecture.zh.md)

Nuxt 4 前端打包进 Electron 壳；Electron 主进程/preload 在 `@growth-os/desktop-core`，本应用提供 UI。运行方式、app/ 结构、技术栈见 [apps/desktop/README.md](../../apps/desktop/README.md)。

## 分层

```
apps/desktop          桌面 UI（Nuxt 4 应用）
  → @growth-os/ui        设计系统（Tailwind v4 + daisyUI）
  → @growth-os/desktop-core  Electron 主进程 + preload（packages/desktop-core）
  → @growth-os/types      共享类型 + IPC 通道契约（packages/types）
```

## 关键机制

- **Electron 接线**：`modules/electron.ts` 通过 vite-plugin-electron 在 dev 编译主进程/preload 并启动窗口，prod 走打包产物。
- **认证**：Supabase Auth，`useAuth`/`useSecureStorage`/`useSupabase` composables；会话经 secureStorage 持久化，`middleware/auth.global.ts` 做路由守卫。登录/登出/403 回退遵循 `.trae/rules/frontend/auth/`（flows、token、credentials）。
- **IPC**：通道名定义在 `@growth-os/types` 的 `ipc-channels.ts`，preload 通过 contextBridge 暴露 `window.desktop` 最小面；改通道需同一变更同步 `apps/desktop` 与 `@growth-os/desktop-core`。
- **样式**：语义色 token、主题经 theme-controller 切换、GSAP 动画、3+ 复用抽到 `@growth-os/ui`——遵循 `.trae/rules/frontend/styles/`。
- **测试**：`test/nuxt/`（集成）+ `test/unit/`（纯逻辑）；测试禁止真调 Supabase 网络与 Electron IPC——遵循 `.trae/rules/frontend/tests/`。

## 验证

- `pnpm --filter desktop test`（单文件：`vitest run test/unit/<file>.test.ts`）
- `pnpm --filter desktop verify:build` — Electron 生产构建冒烟
- 仓库级套件：`pnpm test` → `typecheck` → `lint`
