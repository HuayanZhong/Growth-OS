# desktop — Nuxt 前端 + Electron 壳

[English](README.md) | 中文

Growth OS 桌面端：Nuxt 4 前端打包进 Electron 壳。Electron 主进程/preload 在 `@growth-os/desktop-core`；本应用提供 UI。

## 运行

```bash
cd apps/desktop
pnpm dev              # Nuxt dev + Electron 窗口（vite-plugin-electron）
nuxi nuxt dev         # 仅 Nuxt，浏览器调试
```

生产入口：仓库根 `pnpm start:prod` 用 Electron 加载构建产物。

## 结构

```
app/               # Nuxt 源码
├── components/    # auth（login/register）、ToastContainer
├── composables/   # useAuth、useSecureStorage、useSupabase、useToast
├── layouts/       # default、dashboard
├── middleware/    # auth.global.ts
└── pages/         # auth、dashboard（agents/files/projects/skills）
modules/electron.ts    # vite-plugin-electron 接线
scripts/verify-build.cjs
test/              # nuxt/（集成）+ unit/
```

## 技术栈

Nuxt 4 · Vue 3 · Tailwind CSS v4 · daisyUI · Supabase（认证）· GSAP。设计系统：`@growth-os/ui`；IPC 契约：`@growth-os/types`；Electron 主进程：`@growth-os/desktop-core`。

## 规则

- 认证流程：`.trae/rules/frontend/auth/`（credentials、flows、token）
- 样式：`.trae/rules/frontend/styles/`（colors、themes、animation 等）
- 测试：`.trae/rules/frontend/tests/`（mock、isolation、commands 等）
