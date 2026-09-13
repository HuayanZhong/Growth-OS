# Decay-Audit Backlog

规则/门禁摩擦与腐烂项的落地的 backlog。来源：任务收尾四问（self-improvement §3.4）、rule-decay-audit 审计与行为探针、日常踩坑。每项：发现日期、来源、状态（open / resolved / wontfix）、修复建议。修复本身走正常变更流（批准后改源文件），backlog 只记录不承载修复内容。

## Open

- 2026-09-13 ｜ 日常踩坑（use-gsap-transition dev 验证）｜ 根 `.env`/`.env.development` 的 `PORT=4000` 是给 Nest 的，但 `nuxt dev` 同样读 `PORT`：实测 Nuxt 绑 `::1:4000`、Nest 绑 `:::4000`，同端口两主。衍生症状：渲染层默认 `NUXT_PUBLIC_API_BASE_URL`（http://localhost:4000）经 Chromium 解析到 ::1，/api 请求命中 Nuxt 的 SPA fallback 返回 HTML（CDP 页内 fetch 实测 content-type=text/html），dev 下后端数据请求全部失败。建议：desktop dev 固定独立端口（`.env.development` 加 `NUXT_PORT=3000` 或 desktop dev 脚本传 `--port 3000`），并显式设 `NUXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000`。
- 2026-09-12 ｜ 日常踩坑（SSO change 实测期间）｜ `pnpm dev` 无条件拉起 Electron（[apps/desktop/modules/electron.ts](../../apps/desktop/modules/electron.ts) 的 `listen` hook），没有 Nuxt-only 开关；纯浏览器验证 UI 时桌面窗口被动弹起。建议：模块读环境变量（如 `NUXT_ELECTRON=0`）跳过 build+startup。
- 2026-09-12 ｜ 日常踩坑（同上）｜ dev 会话停止后子进程残留：`nuxt dev` / `nest start` 从 turbo 树中幸存并占端口（实测：孤儿 nuxt 占 4000 伺服 HTML，导致下一次会话 API 请求全部打到它、`ERR_FAILED`）。建议：StopCommand/turbo kill 后检查 3000/4000 监听进程并清理，或给 dev 脚本加进程树终止（Windows `taskkill /T`）。
- 2026-09-12 ｜ 观察级 ｜ agent 撰写仓库内 markdown 时倾向写 `file:///` 绝对链接，`verify:docs` 每次都拦（gate 行为正确）。建议：无需动作；在收尾/写产物时默认用相对链接即可。记录在此防止重复踩坑误判为 gate 故障。

## Resolved

- 2026-09-13 ｜ use-gsap-transition 收尾四问 ｜ 根 [AGENTS.md](../../AGENTS.md) graphify 引导写 `graphify --update`，实际 CLI 无此命令（正确为 `graphify update .`，实测 `error: unknown command`）。已就地修入（rule-decay-audit 的 fix-drift-in-place 定位，同日过 docs gate）。
- 2026-09-12 ｜ SSO change 收尾四问 ｜ 根 [AGENTS.md](../../AGENTS.md) Commands 区单文件测试命令 `pnpm --filter desktop vitest run <file>` 失效（recursive-run 要求同名 script，实测 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`）。修复：改为 `pnpm --filter desktop exec vitest run <file>`（用户批准，同日改入 AGENTS.md）。
