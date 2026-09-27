# Agent Note: 前端统一认证失效边界

Status: implemented

Change: [harden-auth-boundary](../../../../openspec/changes/archive/2026-09-28-harden-auth-boundary/proposal.md)

自有后端请求入口 `apiFetch` 收口 401 处置：先 `refreshSession()` 自动重试原请求一次，刷新失败则本地登出（`signOut({ scope: 'local' })`）并回登录页，并发 401 经模块级 in-flight Promise 去重；路由守卫增加本地 `expires_at` 过期预检，拦截磁盘持久化的死会话；`useAgents` 以 `loadError` 暴露目录加载失败，新任务页据此四态互斥呈现（加载中/可重试错误/空态/就绪）。错误分流原则：会话失效终态为登录页，5xx/断网/其他 4xx 原地可重试、绝不登出跳转。设计决策与替代方案见该 change 的 proposal/design。
