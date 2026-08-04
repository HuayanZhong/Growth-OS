# Dashboard 路由设计计划（对标 Coze 桌面端）

## Summary

在 `apps/desktop/app/pages/dashboard/` 下从零搭建应用主 shell：左侧导航栏（AGENTS、技能、项目、文件）+ 右侧内容区，对标 Coze 桌面端布局。全部为空壳页面，无真实业务内容。同时将登录后跳转目标从 `/` 改为 `/dashboard`。

## Current State Analysis

### 已有基础
- **Nuxt 4 SPA**（`ssr: false`），文件路由，源码在 `app/` 目录下
- **Tailwind CSS v4 + daisyUI 5**，样式经 `@growth-os/ui` 包单一入口分发
- **UI 包**（`packages/ui`）：已有 `cn()` 类名合并工具 + `ThemeToggle` 组件，shadcn 风格架构（`components/ui/<name>/` + barrel 导出）
- **认证流程**：Supabase Auth 完整可用，全局守卫 `auth.global.ts` 管控路由
- **现有页面**：`/auth`（登录/注册）、`/`（临时 hero 落地页）

### 缺失部分
- `pages/dashboard/` 目录完全不存在
- 无任何应用 shell 布局（侧边栏 + 顶栏 + 内容区）
- `layouts/default.vue` 是空壳 `<slot />`
- 无 sidebar / nav / 导航类组件
- 登录后跳转到 `/`（临时页），未指向 dashboard

### Coze 桌面端布局参考（来自官方文档与 release notes）
- 左侧固定导航栏：工作区 → 开发（Agents / Apps / Workflows）→ 资源（Plugins / Knowledge / Databases）
- Coze 2.0 改版：工作区管理提升至顶层，二级导航移至页面顶部，通知/计费入口在左下角
- 导航项：Dashboard / Agents / Skills / Tasks / Workspace / Settings
- 底部：用户头像 + 设置入口

## Proposed Changes

### 1. 侧边栏导航组件 `app/components/dashboard/Sidebar.vue`
**what**：dashboard 专属侧边栏，固定左侧，包含导航项 + 底部用户区。
**why**：对标 Coze 左侧导航；dashboard 专属组件放 app 层而非 UI 包（不跨应用复用）。
**how**：
- 宽度 `w-60`（240px），`bg-base-200` 背景，`border-r border-base-300` 分隔线
- 导航项用 `NuxtLink` + daisyUI `menu` 组件，每项含内联 SVG 图标 + 中文标签
- 顶部：应用 Logo "Growth OS" + 工作区切换占位
- 中部导航项（按用户要求 + Coze 参考）：
  - 概览 → `/dashboard`
  - AGENTS → `/dashboard/agents`
  - 技能 → `/dashboard/skills`
  - 项目 → `/dashboard/projects`
  - 文件 → `/dashboard/files`
- 底部：用户邮箱（从 `useAuth` 获取）+ 退出登录按钮 + `ThemeToggle`
- 激活态：`NuxtLink` 的 `routerLinkActive` → daisyUI `active` 类
- 颜色全用语义令牌（`base-*`、`primary`），无硬编码色值

### 2. Dashboard 父路由 `app/pages/dashboard.vue`
**what**：dashboard shell 容器，左侧 `Sidebar` + 右侧 `<NuxtPage />`。
**why**：Nuxt 文件路由嵌套路由——`dashboard.vue` 作为父路由组件，子页面经 `<NuxtPage />` 渲染，sidebar 在路由切换间持久存在不重渲染。
**how**：
```
<div class="flex h-screen">
  <Sidebar />                    <!-- 左侧固定导航 -->
  <main class="flex-1 overflow-auto bg-base-100">  <!-- 右侧内容区 -->
    <NuxtPage />                 <!-- 子路由渲染出口 -->
  </main>
</div>
```
- `h-screen` + `flex` 撑满桌面窗口，内容区独立滚动
- 无 GSAP 动画（shell 不需要切换动画，遵循"简单过渡优先 CSS"原则）

### 3. 子页面（5 个空壳）
每个页面结构统一：顶部标题栏 + 空状态占位。

| 文件 | 路由 | 标题 | 说明 |
|------|------|------|------|
| `app/pages/dashboard/index.vue` | `/dashboard` | 概览 | 工作台概览空壳 |
| `app/pages/dashboard/agents.vue` | `/dashboard/agents` | AGENTS | 智能体列表空壳 |
| `app/pages/dashboard/skills.vue` | `/dashboard/skills` | 技能 | 技能列表空壳 |
| `app/pages/dashboard/projects.vue` | `/dashboard/projects` | 项目 | 项目列表空壳 |
| `app/pages/dashboard/files.vue` | `/dashboard/files` | 文件 | 文件管理空壳 |

**每页模板结构**：
```vue
<div class="p-6">
  <h1 class="text-2xl font-semibold mb-4">{标题}</h1>
  <div class="card bg-base-200 border border-base-300">
    <div class="card-body items-center text-center">
      <!-- daisyUI 空状态占位 -->
      <span class="text-base-content/50">{描述文字}</span>
    </div>
  </div>
</div>
```

### 4. 更新认证守卫 `app/middleware/auth.global.ts`
**what**：登录后跳转目标从 `/` 改为 `/dashboard`。
**why**：dashboard 是登录后的真实入口，`/` 临时页应废弃。
**how**：
- `loggedIn && isAuthPage` → `navigateTo('/dashboard')`
- `!loggedIn && !isAuthPage` 保持跳 `/auth`
- `/dashboard` 及其子路由自动受守卫保护（非 `/auth` 前缀）

### 5. 更新首页 `app/pages/index.vue`
**what**：`/` 重定向到 `/dashboard`。
**why**：消除临时落地页，所有登录后入口统一指向 dashboard。
**how**：改为 `definePageMeta({ middleware: () => navigateTo('/dashboard') })`，或直接在 `index.vue` 中调用 `navigateTo`。保留文件避免路由 404。

## Assumptions & Decisions

1. **侧边栏组件放 app 层不放 UI 包**：`Sidebar` 是 dashboard 专属、不跨应用复用，放 `app/components/dashboard/`。若后续需要通用 NavItem，再按 reuse 规则抽到 UI 包。
2. **图标用内联 SVG**：项目无图标库依赖，ThemeToggle 已用内联 SVG 先例，不新增依赖。每个导航项一个简单线条图标。
3. **不加 GSAP 动画**：shell 布局无需切换动画，遵循"简单过渡优先 CSS transition"规则。仅 hover 用 CSS `transition-colors`。
4. **不引入 cva**：侧边栏导航项暂无多变体需求，当前只有一个 active/inactive 状态，用 `NuxtLink` 内置 class 即可。后续如需多变体再引入。
5. **`/` 不删除而是重定向**：避免外部链接或书签 404，用重定向兼容。
6. **用户信息来源**：复用 `useAuth().getSession()` 获取邮箱，与现有 `pages/index.vue` 一致。
7. **响应式**：Electron 桌面端固定桌面尺寸，sidebar 固定 `w-60` 不做折叠。如后续需要窄窗口折叠，再按 responsive 规则增强。

## Verification

1. **typecheck**：`pnpm --filter @growth-os/desktop typecheck` 通过
2. **样式规则核查**：
   - `rg -n '#[0-9a-fA-F]{3,8}\b|(bg|text)-\[#' --glob '*.vue' apps packages` 无硬编码色值
   - `rg -n 'style="' --glob '*.vue' apps packages` 无内联 style
3. **路由验证**（浏览器实测）：
   - 未登录访问 `/dashboard` → 重定向到 `/auth`
   - 登录后访问 `/auth` → 重定向到 `/dashboard`
   - 登录后访问 `/` → 重定向到 `/dashboard`
   - `/dashboard` 子路由（agents/skills/projects/files）均可正常切换
   - 侧边栏激活态正确高亮当前路由项
   - 侧边栏在子路由切换时不重渲染（持久存在）
4. **视觉验证**：侧边栏固定左侧、内容区右侧滚动、底部用户信息 + 主题切换正常

## 涉及文件清单

**新增**：
- `apps/desktop/app/components/dashboard/Sidebar.vue`
- `apps/desktop/app/pages/dashboard.vue`
- `apps/desktop/app/pages/dashboard/index.vue`
- `apps/desktop/app/pages/dashboard/agents.vue`
- `apps/desktop/app/pages/dashboard/skills.vue`
- `apps/desktop/app/pages/dashboard/projects.vue`
- `apps/desktop/app/pages/dashboard/files.vue`

**修改**：
- `apps/desktop/app/middleware/auth.global.ts`（跳转目标 `/` → `/dashboard`）
- `apps/desktop/app/pages/index.vue`（改为重定向到 `/dashboard`）
