# Design: harden-auth-boundary

## Context

现状与动机见 proposal.md。补充设计输入：

- `apiFetch`（`app/composables/useApi.ts`）是自有后端唯一请求入口，每次调用经 `getSession()` 取 access_token 拼 `Authorization` 头；非 2xx 统一抛 `ApiError(status, envelope)`。注释声称"401 → 引导重登"，无实现。
- supabase-js 配置 `autoRefreshToken: true`（`app/composables/useSupabase.ts`），但桌面休眠/重启后刷新定时器不可依赖；磁盘持久化会话（secureStorage）使"UI 已登录、token 已死"成为常态场景（`.trae/rules/frontend/auth/flows.md` 的 sign-out 一节即为此而设）。
- `app-sidebar.vue` 已在事件处理器（非 setup 同步上下文）中调用 `await navigateTo('/auth')` 并正常工作，证明本仓库 SPA（ssr: false）客户端环境下 `navigateTo` 可在普通 async 函数中调用。
- 该区域的既有决策：目录服务端化为唯一数据源（seed 行 + 三端点），见 [2026-09-28-server-agent-directory.md](../../../../.agents/notes/implemented/feature/2026-09-28-server-agent-directory.md)；本设计不推翻其中任何决策。
- 既有测试文件可扩展：`test/nuxt/use-api.test.ts`、`test/nuxt/use-agents.test.ts`、`test/nuxt/auth-middleware.test.ts`。

## Goals / Non-Goals

**Goals:**

- 认证失效（401）在请求层一个出口收口：刷新重试一次 → 失败则本地登出 + 回登录页
- 服务器故障（5xx）/网络故障/其他 4xx 明确不触发登出与跳转
- 守卫用本地过期预检拦截持久化的死会话（不发网络请求）
- 目录页四态互斥呈现，失败态可重试且不误导"重新登录"

**Non-Goals:**

- 不处理 Supabase Auth API 自身的 401/403（由 supabase-js 内部与既有 auth flows 规则覆盖）
- 不引入 `onAuthStateChange` 全局监听（本次用 API 层出口 + 守卫预检双保险；全局监听留作后续可选加固）
- 不改服务端错误信封、状态码语义与任何端点行为
- 不改 `@growth-os/types` 契约，不动 IPC
- 不做请求排队/自动重试队列（桌面单用户场景，一次刷新重试足够）

## Decisions

### D1: 401 出口收敛在 apiFetch 内部，而不是每个调用方自理

调用方自理已被现状证伪（loadAgents 吞错即僵尸态来源）。apiFetch 是唯一入口，在此收口使所有现存与未来调用方（useAgents、后续 domains）自动获得一致行为。替代方案"封装 useApiFetch composable 由调用方注册回调"被否：引入注册秩序，漏注册即漏洞。

### D2: 401 后先 refreshSession() 重试一次，失败才登出重定向

桌面场景下 access token 过期与 supabase-js 后台刷新存在竞态（休眠唤醒后定时器延迟）：直接登出会误杀可恢复会话。`refreshSession()` 显式刷新成功后再重试一次原请求（重新 `getSession()` 取新 token），是误杀与僵尸态之间的平衡点。替代方案"信任 autoRefreshToken 不做 401 处理"被否：刷新失败（refresh token 被吊销）后请求会永远 401 循环。刷新仍失败 ⇒ refresh token 已死 ⇒ 登出重定向是唯一正确终态。

### D3: 并发 401 用模块级 in-flight Promise 去重

会话失效时目录、侧边栏等多个请求并发 401。做法：刷新 + 重试 + 登出重定向的处置过程共享同一个模块级 in-flight Promise（后续 401 复用同一处置，不重复刷新/登出/导航）。去重窗口随处置 Promise 结束而关闭，不设永久标志——用户重新登录后的下一次失效必须能再次触发完整流程。替代方案"永久 handled 标志"被否：会导致重登后失效不再被接管。

### D4: 守卫过期预检只做本地比较，不触发刷新

守卫比较 `session.expires_at <= Date.now()/1000`（与 `useAuth.signOutWithFallback` 既有判定一致）视同未登录，走既有 `/auth` 导航分支。不调 `refreshSession`：守卫应保持零网络请求、无新增失败模式；token 新鲜度由 apiFetch 的 401 出口兜底，职责分层清晰。与 D2 配合：守卫拦"本地已知的死会话"（快速路径），apiFetch 兜"运行中过期的会话"（准确路径）。

### D5: loadAgents 停止吞错，以 refs 暴露 `loadError`，页面自行派生四态

模块单例新增 `loadError = ref<ApiError | null>(null)`：成功置 null、失败置错误；与既有 `loaded` 组合派生状态——`!loaded && !loadError` 加载中、`loadError` 失败（可重试）、`loaded && !defaultAgent` 目录为空、`loaded && defaultAgent` 就绪。重试 = 再次调用 `loadAgents()`。不引入完整状态机枚举（useAgents 返回值结构变化最小化），不迁移 `useAsyncData`（超出本变更范围且单例模式与其语义冲突）。

### D6: 登出重定向复用既有降级纪律

登出用 `signOut({ scope: 'local' })`（对齐 flows.md：会话已死时不请求服务端 logout），导航用 `navigateTo('/auth')`（app-sidebar 事件处理器已有同类调用先例）。apiFetch 的 401-本地无 token 分支（现状直接 throw）同样收敛到此出口。登录页与 OAuth 流程不经过 apiFetch，无重定向死循环风险。

## Risks / Trade-offs

- [navigateTo 在深层 async 调用链中丢失 Nuxt 上下文] → 客户端 SPA 下 Nuxt 实例为模块级持有，且仓库内 app-sidebar 已有先例；`test/nuxt/use-api.test.ts` 用 @nuxt/test-utils 运行时直接覆盖"401 刷新失败 → 导航发生"用例，若运行时不成立，退路是在插件中缓存 `router` 实例供 apiFetch 使用（apply 阶段验证，不影响 spec 行为）
- [客户端时钟偏移导致守卫误拦有效会话] → expires_at 本地比较是既有 sign-out 流程已接受的取舍（token.md）；误拦代价 = 回登录页重新认证，可接受
- [刷新重试使 401 处置多一个网络往返] → 仅发生在 token 过期场景，一次刷新换回不丢会话，值；并发场景被 D3 去重为一次
- [dashboard 布局挂载即调 loadAgents 的时序不变] → 401 处置后目录单例被 `resetAgents()` 之外的路径清理需注意：登出重定向路径上布局 `onUnmounted` 已调 `resetAgents()`，与既有登出清理一致，无残留
- [supabase-js refreshSession 对被吊销 refresh token 的行为随版本差异] → 实现以"refreshSession 抛错或返回 error 即视为刷新失败"为准，不依赖具体错误码枚举

## Migration Plan

纯前端改动，无数据迁移。单次合并上线；回滚 = revert 对应 commit。上线观察点：桌面端重启后进入工作台不再出现"已登录 + 目录死态"；服务端停机时目录页呈错误态且可重试。

## Open Questions

无——navigateTo 上下文问题若在 apply 阶段复现，退路已定（D1 风险项），不影响 spec 与任务拆分。
