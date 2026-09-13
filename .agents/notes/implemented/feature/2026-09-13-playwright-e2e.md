# Agent Note: Playwright E2E（桌面端端到端测试层）

Status: implemented

桌面端建立 Playwright E2E 层（`apps/desktop/test/e2e/`，Nuxt 官方目录结构 test/ 下按环境划分，Chromium only）：web 模式主链路（真实 Supabase 账号走 登录 → 工作台 → 登出、无效凭据拒绝、登录/注册翻转）+ Electron 生产构建冒烟（`_electron` 启动 `dist/main.js` 验证窗口与认证页渲染）；凭据经 dotenv 链注入、缺失时用例级自动 skip。实施中顺带修复两个既有环境缺陷：`NUXT_APP_BASE_URL=./` 必须经 `.env.production` 传入（Nitro 会把 nuxt.config 里的相对值规范化回 `/` 导致 file:// 白屏，且该变量进 `.env` 会经 c12 污染 dev 模式深路由）；turbo build inputs 补入 `.env*` 防止 git-ignored env 变更后回放缓存产物。desktop-core 新增 `ELECTRON_USER_DATA_DIR` env 入口用于冒烟会话隔离（正常启动零行为变化）。完整决策与备选方案见 [openspec/changes/archive/2026-09-13-add-playwright-e2e](../../../../openspec/changes/archive/2026-09-13-add-playwright-e2e/proposal.md)（proposal/design/specs/tasks）。
