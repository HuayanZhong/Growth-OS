# Proposal: add-playwright-e2e

## Why

桌面端现有测试止步于单元/组件级（vitest + @nuxt/test-utils）与 server API 层 e2e（supertest），真实浏览器与真实 Electron shell 中的用户主链路（登录 → 工作台 → 登出）和动画回归只能靠人工或一次性 CDP 脚本验证，不可持续复用。近期 useGsapTransition 迁移的视觉验证（5 场景 × CDP）证明这类覆盖有价值且可自动化，需要沉淀为可重复执行的 E2E 资产。

## What Changes

- 引入 Playwright（`@playwright/test`，**Chromium only**）作为桌面端 E2E 框架，落在 `apps/desktop/test/e2e/`（Nuxt 官方目录结构：test/ 下按环境划分 e2e/nuxt/unit）
- **web 模式主链路**：Playwright `webServer` 自动拉起 Nuxt dev server（3000 端口），真实 Supabase 测试账号（root `.env` 的 `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD`，仅引用变量名、绝不硬编码）走通 登录 → 工作台 → 登出 全链路，覆盖 登录/注册翻转、toast 生命周期、dashboard 布局入场、路由导航
- **Electron 冒烟**：Playwright `_electron` 启动生产构建产物（`packages/desktop-core/dist/main.js`），验证应用启动、窗口创建、登录页渲染（不覆盖 OAuth 弹窗与系统级 IPC）
- 凭据缺失时相关用例**自动 skip**（沿用 server e2e 的先例语义），不阻塞无凭据环境（CI 本地层）
- 本 change **不改动 CI 工作流**（Playwright E2E 仅本地执行；CI 集成含 Chromium 安装、Supabase 网络可达性与 secrets 依赖，留待后续独立 change 评估）

## Capabilities

### New Capabilities

- `e2e-testing`: 桌面端 Playwright E2E 的外部可观察行为——web 主链路与 Electron 冒烟的覆盖范围、真实凭据注入与缺失时的 skip 语义、Chromium-only 约束、与既有测试层（vitest 单元/组件、server e2e）的边界

### Modified Capabilities

<!-- 无：既有 capability 的需求不变 -->

## Impact

- **apps/desktop**：新增 `test/e2e/` 目录与 `playwright.config.ts`；`package.json` 新增 `test:e2e` 脚本与 devDependency
- **pnpm-workspace.yaml**：`test` catalog 新增 `@playwright/test`
- **apps/server / packages/**：server 零改动；`packages/desktop-core` 新增一处 env 驱动的 userData 隔离入口（`ELECTRON_USER_DATA_DIR` → `app.setPath`，仅 E2E 冒烟注入该变量，正常启动零行为变化）——冒烟需要与用户日常 `file://` origin 会话隔离（读侧避免自动登录、写侧避免清掉用户真实登录态），而 `_electron.launch` 无 userDataDir 选项、Electron 不支持外部指定 userData 参数
- **CI（.github/workflows/ci.yml）**：不变
- **harness assets（.trae/ / .agents/ / AGENTS.md）**：本 change 不触碰
- 依赖新增：`@playwright/test`（catalog 协议）+ Playwright Chromium 浏览器二进制（`playwright install chromium`，本地一次性）
