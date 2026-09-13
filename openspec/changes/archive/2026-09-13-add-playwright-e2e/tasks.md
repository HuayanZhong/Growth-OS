# Tasks: add-playwright-e2e

## 1. 依赖与框架配置

- [x] 1.1 `pnpm-workspace.yaml` 的 `test` catalog 新增 `@playwright/test`；`apps/desktop/package.json` 新增 devDependency（catalog: 协议）与 `test:e2e` 脚本（经 dotenv-cli `-e .env.local -e .env.development -e .env` 链注入凭据后运行 `playwright test`）；执行 `pnpm install` 与 `playwright install chromium`。Verify: `pnpm --filter desktop exec playwright --version`
- [x] 1.2 新建 `apps/desktop/playwright.config.ts`：projects 仅 chromium（D4）；webServer 运行 `nuxt dev --dotenv ../../.env --port 3000`，`reuseExistingServer: !CI`、超时放宽（D2）；testDir 指向 `test/e2e/`；Electron 冒烟与 web 用例分 project 或分目录组织。Verify: `pnpm --filter desktop exec playwright test --list`（列出用例且不报配置错误）

## 2. web 模式主链路（`test/e2e/web/`）

- [x] 2.1 新建 `test/e2e/helpers/credentials.ts`：从 `process.env` 读取 `SUPABASE_TEST_EMAIL` / `SUPABASE_TEST_PASSWORD`，导出"凭据就绪"判断与 `test.skip` 包装（D5）；凭据值不进入任何日志。Verify: `pnpm --filter desktop exec vue-tsc --noEmit`（或项目等效 typecheck 命令）
- [x] 2.2 新建 `test/e2e/web/auth.spec.ts`：真实凭据登录进入工作台 → 登出回认证页（含受保护路由重定向）；无效密码停留认证页且有错误反馈；登录↔注册双向切换后目标表单可交互、无遮挡残留。选择器对齐现有组件（`input[name="email"]`、`button[type="submit"]`、`button[title="退出登录"]` 等）。Verify: `pnpm --filter desktop exec playwright test test/e2e/web`（webServer 自动拉起，全程绿灯）
- [x] 2.3 凭据缺失语义验证：临时清空两个环境变量重跑 web 用例，确认真实凭据用例 skipped、无效凭据/表单切换用例照常执行、退出码为 0（spec 的 skip 语义）。Verify: 同上命令 + 观察报告 skipped 计数

## 3. Electron 冒烟（`test/e2e/electron/`）

- [x] 3.1 新建 `test/e2e/electron/app.spec.ts`：`_electron.launch` 启动 `packages/desktop-core/dist/main.js --no-sandbox`（独立 userData 目录，D3）；断言主窗口创建、认证页表单元素渲染；清理钩子兜底 `taskkill /T` 收割进程树；前置条件 `pnpm build` 产物存在（缺失时给出明确失败信息而非静默 skip）。Verify: 先 `pnpm build`，再 `pnpm --filter desktop exec playwright test test/e2e/electron`

## 4. 全量验证与收尾

- [x] 4.1 单命令全量回归：凭据就位环境运行 `pnpm --filter desktop test:e2e`，web + Electron 全部通过、无残留 3000 监听进程（对照 spec"单命令可执行"与"无残留进程"）。Verify: `pnpm --filter desktop test:e2e` + 结束后 `Get-NetTCPConnection -State Listen -LocalPort 3000` 为空
- [x] 4.2 全仓库验证套件不受影响：`pnpm test` → `pnpm typecheck` → `pnpm lint` 全绿（E2E 目录纳入 lint/typecheck 范围时需同步修复）；`pnpm hygiene` 无新增 knip 未用导出。Verify: 三条命令 + `pnpm hygiene`
- [x] 4.3 Ship Agent Note（thin pointer 契约）记录 E2E 层落位与设计取舍；`pnpm verify` 全绿。Verify: `pnpm verify`
