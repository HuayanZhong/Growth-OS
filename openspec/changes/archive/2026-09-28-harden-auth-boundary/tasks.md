# Tasks: harden-auth-boundary

## 1. API 层统一 401 出口（design D1–D3、D6）

- [x] 1.1 `app/composables/useApi.ts`：实现 401 处置——收到 401 后 `refreshSession()`，成功则重取 token 重试原请求一次；刷新失败则 `signOut({ scope: 'local' })` + `navigateTo('/auth')`；本地无 token 分支收敛到同一登出出口；并发 401 共享模块级 in-flight Promise 去重。扩展 `test/nuxt/use-api.test.ts`：401→刷新成功→重试成功不登出、401→刷新失败→本地登出并导航 /auth、并发 401 仅一次处置、500/网络异常/其他 4xx 均不触发登出与导航。验证：`pnpm --filter desktop exec vitest run test/nuxt/use-api.test.ts`
- [x] 1.2 确认登出重定向在运行时真实发生（navigateTo 上下文验证，design 风险项退路见 D1 风险行）：如 `navigateTo` 在 apiFetch 调用链中抛上下文错误，则改为插件内缓存 router 实例方案并同步更新 1.1 用例。验证：`pnpm --filter desktop exec vitest run test/nuxt/use-api.test.ts` 全绿且包含导航断言

## 2. 路由守卫过期预检（design D4）

- [x] 2.1 `app/middleware/auth.global.ts`：`session.expires_at` 已过期视同未登录（与 `useAuth.signOutWithFallback` 同一比较式），守卫不发网络请求、不主动登出。扩展 `test/nuxt/auth-middleware.test.ts`：过期 session 访问受保护页 → navigateTo /auth、有效 session 放行、getSession 异常 → /auth。验证：`pnpm --filter desktop exec vitest run test/nuxt/auth-middleware.test.ts`

## 3. 目录加载错误暴露与页面四态（design D5）

- [x] 3.1 `app/composables/useAgents.ts`：新增 `loadError` ref（成功置 null、失败置 ApiError），`loadAgents` 停止吞错；导出供页面消费；重试 = 重复调用 `loadAgents()`。扩展 `test/nuxt/use-agents.test.ts`：成功清除错误、失败记录错误、重试成功恢复。验证：`pnpm --filter desktop exec vitest run test/nuxt/use-agents.test.ts`
- [x] 3.2 `app/pages/dashboard/tasks/new.vue`：消费 `loaded`/`loadError` 拆分四态——加载中（无错误/空态文案，消除首帧闪现）、加载失败（错误提示 + 重试按钮，文案不出现"重新登录"）、目录为空（空态提示、发送不可用）、就绪（问候语 + 发送可用）。新增页面测试 `test/nuxt/tasks-new.test.ts` 覆盖四态互斥与重试交互（mock useAgents 单例）。验证：`pnpm --filter desktop exec vitest run test/nuxt/tasks-new.test.ts`
- [x] 3.3 会话失效接管路径回归：目录请求 401 且刷新失败时，页面不进入错误态、应用导航至登录页（apiFetch 出口已处理，本任务验证页面无额外吞错逻辑干扰）。验证：`pnpm --filter desktop exec vitest run test/nuxt/use-api.test.ts test/nuxt/use-agents.test.ts test/nuxt/tasks-new.test.ts`

## 4. 浏览器端验证（前端已由用户启动；用 chrome-devtools MCP 打开页面，勿自行起服务）

- [x] 4.1 就绪态与错误态：chrome-devtools 打开运行中的前端 → 登录 → /dashboard/tasks/new 呈就绪态（问候语 + 发送可用）；将 API 指向不可达地址（或临时停 server，仅限本机验证后恢复）→ 呈错误态 + 重试按钮、无"重新登录"文案 → 点击重试恢复/维持错误态不白屏。验证：页面行为可观察、无 console 报错（`list_console_messages`）
- [x] 4.2 守卫过期预检与 401 重定向：chrome-devtools 中将本地持久化 session 的 `expires_at` 改为过去时间 → 访问 /dashboard/tasks/new → 被送回 /auth；将 access_token 置为无效值（保留可刷新的 refresh token）→ 页面请求 401 → 自动刷新重试成功、停留在就绪态不跳转。验证：观察导航行为与网络请求（`list_network_requests`）

## 5. 收尾验证与项目记忆

- [x] 5.1 全量前端验证三连：`pnpm --filter desktop test` → `pnpm --filter desktop typecheck` → `pnpm --filter desktop lint`，全绿
- [x] 5.2 按文档规则新增 thin pointer Agent Note（`.agents/notes/implemented/feature/`，摘要 + 指向本 change），若目录数据流或 auth 边界描述受影响则同步更新对应 `.trae/rules/frontend/auth/*.md` 引用（只链接不改规则语义）。验证：`pnpm verify:docs`
- [x] 5.3 仓库级收口：`pnpm verify`（invariants + docs + gates）全绿
