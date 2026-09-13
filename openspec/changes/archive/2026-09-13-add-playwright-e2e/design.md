# Design: add-playwright-e2e

## Context

桌面端测试现状：vitest + @nuxt/test-utils（单元/组件，`test/unit` + `test/nuxt`）、server 侧 supertest e2e（凭据缺失自动 skip 的先例）。真实浏览器与 Electron shell 的主链路验证此前靠一次性 CDP 脚本（见 [.agents/notes/implemented/feature/2026-09-10-github-oauth-sso.md](../../../../.agents/notes/implemented/feature/2026-09-10-github-oauth-sso.md)），该实践验证了"真实 shell 中走用户链路"的价值，但不可重复执行。graphify 揭示的 gsap 星型枢纽问题（见 [.agents/notes/implemented/feature/2026-09-13-use-gsap-transition.md](../../../../.agents/notes/implemented/feature/2026-09-13-use-gsap-transition.md)）说明视觉/交互回归需要可固化的资产。dev 环境的端口碰撞已修复（[.agents/notes/backlog-decay-audit.md](../../../../.agents/notes/backlog-decay-audit.md) Resolved 区）：dev server 固定 3000、渲染层 API 基座显式 127.0.0.1:4000，E2E 的 webServer 编排建立在这个确定性之上。

## Goals / Non-Goals

**Goals:**
- 一条命令跑完 web 主链路 + Electron 冒烟（自动拉起/复用 dev server、自动清理）
- 真实 Supabase 账号走通登录→登出；凭据缺失自动 skip
- Electron 冒烟消费生产构建产物，补上 `verify:build` 只验证"能加载"不带交互断言的空档

**Non-Goals:**
- 不集成进 CI（Chromium 安装、Supabase 网络依赖、secrets 编排留待独立 change）
- 不覆盖 OAuth 弹窗流程与系统级 IPC（secureStorage/证书等）——沿用既有单测 mock 策略（.trae/rules/frontend/tests/mock.md）
- 不做视觉回归（截图像素对比）；动画只断言结束态可交互，不断言中间帧
- 不引入多浏览器矩阵（Firefox/WebKit）

## Decisions

- **D1 位置与编排**：测试落在 `apps/desktop/test/e2e/`（Nuxt 官方目录结构：test/ 按环境划分 e2e/nuxt/unit），`playwright.config.ts` 在 `apps/desktop`；`test:e2e` 脚本经 dotenv-cli `-e` 链（与 root dev 脚本同序）注入凭据。备选"包根独立 `e2e/` 目录"被否：偏离 Nuxt 官方 test/ 目录约定，且与 server 侧 `test/` 含 e2e 的组织不一致。
- **D2 web 模式 server 编排**：Playwright `webServer` 配置直接运行 `nuxt dev --dotenv ../../.env --port 3000`（`reuseExistingServer: !CI`）——复用本 change 之前确立的固定端口，避免 turbo 并行编排；结束后 Playwright 自动收割进程树，缓解 backlog 中"dev 孤儿进程占端口"的摩擦模式。备选"假设外部已起 dev server"被否：单命令可执行是 spec 需求。
- **D3 Electron 冒烟走生产构建 + userData 隔离**：`_electron.launch` 指向 `packages/desktop-core/dist/main.js`，执行前置任务完成 `pnpm build`。备选"dev URL 启动"被否：dev 模式已被 web 层覆盖，生产构建冒烟才有增量价值（同时覆盖模块的 build:done 钩子产物）。启动参数带 `--no-sandbox`；userData 隔离经 desktop-core 新增的 `ELECTRON_USER_DATA_DIR` env 入口（bootstrap 在 app ready 前 `app.setPath('userData', ...)`，正常启动不设该变量、零行为变化）——备选"_electron 直接指定 userData"不存在（launch options 无此字段、Electron 亦不认外部 userData 参数），备选"共享默认 userData"被否：`file://` origin 的 localStorage 即用户日常生产会话存储，读侧会自动登录跳过认证页、写侧（清理）会破坏用户真实登录态。
- **D4 Chromium only**：Playwright `projects` 仅保留 chromium。备选"多引擎矩阵"被否：用户已确认范围；daisyUI/GSAP 在多引擎下的差异不构成当前风险面。
- **D5 凭据注入与 skip**：helper 统一从 `process.env` 读取 `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD`，缺失时对依赖真实凭据的用例调用 `test.skip(..., 'credentials missing')`；不依赖凭据的用例独立成文件/分组，保证 skip 语义可机械执行。备选"无凭据时用本地 mock Supabase"被否：主链路价值在真实鉴权，mock 化会退化为组件测试。
- **D6 CI 不动**：本 change 不改 `.github/workflows/ci.yml`。CI 集成需要 Chromium 安装、Supabase 网络可达、secrets 编排（`SUPABASE_TEST_*` 已有 CI secrets 先例），作为独立 change 评估，避免本 change 范围膨胀。

## Risks / Trade-offs

- **Windows 下 `_electron.launch` 的进程回收**：Playwright 对 Electron 子进程树的收割在 Windows 上不保证完全，沿用 backlog 中 taskkill /T 的清理经验，在 e2e 清理钩子里兜底杀进程树。
- **生产构建冒烟依赖 `pnpm build` 时长**：构建放执行前置（Playwright globalSetup 外的脚本编排），并在 config 中放宽超时；CI 集成时该成本同样存在。
- **真实登录依赖 Supabase 云端可用性**：超时与重试由 Playwright 自带断言超时承担；云端不可用时表现为失败而非 skip（凭据存在即认为环境承诺可用），该权衡记录在案。
- **dev server 冷启动时长波动**（此前 180s 假死的教训）：`webServer.timeout` 显式放宽，端口固定后健康检查路径确定（3000 返回 Nuxt HTML）。
