# Proposal: harden-auth-boundary

## Why

Electron 桌面端磁盘持久化会话（secureStorage）使 token 过期后 UI 仍显示"已登录"，而前端对认证失效没有任何统一出口：`apiFetch` 注释声称"401 → 引导重登"但无实现，`loadAgents` 的 `catch {}` 把 401/403/500/断网一律吞掉回退空目录，路由守卫只判 `!!session` 不看 `expires_at`。结果是用户落在"侧边栏已登录 + 内容区显示『目录暂时无法加载，请稍后重试或重新登录』"的僵尸态，既不能重试也不能重登；且该文案同时覆盖加载中/加载失败/目录为空三种语义（首帧还会闪现报错文案）。会话已死时必须送回登录页，服务器故障时必须原地可重试——两者现在都没有。

## What Changes

- `apiFetch`（前端自有后端唯一请求入口）增加统一 401 出口：401 时先尝试 `refreshSession()` 并原请求重试一次，刷新失败则 `signOut({ scope: 'local' })` 清理本地会话并导航回 `/auth`；调用方无感知
- 路由守卫 `auth.global.ts` 增加过期预检：`session.expires_at` 已过期的会话视同未登录，走既有的"未登录 → /auth"分支
- 目录加载 `loadAgents` 停止吞错：暴露加载错误状态，供页面区分呈现
- 新任务页（tasks/new.vue）消费加载状态，拆分四态：加载中（骨架/静默）/ 可重试错误态（附"重试"动作，走 `loadAgents`）/ 目录为空态（提示文案）/ 就绪态；错误态不再误导用户"重新登录"（500/断网时会话仍有效）

## Capabilities

### New Capabilities

- `frontend-auth-boundary`: 前端统一认证失效边界——`apiFetch` 的 401 刷新重试与登出重定向、路由守卫的本地过期预检、错误分流原则（会话失效 → 登录页；服务器/网络故障 → 原地错误态）

### Modified Capabilities

- `agents/agent-directory`: 新增前端目录页呈现需求——目录页 SHALL 区分加载中/加载失败（可重试）/目录为空/就绪四种状态，替代现有"加载中、失败、为空共用一句『目录暂时无法加载』"的单态呈现

## Impact

- 影响层：仅 `apps/desktop`（前端层），不涉及 `apps/server`、`packages/*`、Electron 主进程与 IPC 契约
- 涉及文件（预估）：`app/composables/useApi.ts`、`app/composables/useAgents.ts`、`app/middleware/auth.global.ts`、`app/pages/dashboard/tasks/new.vue`，对应测试在 `apps/desktop/test/`（nuxt env：useAgents/useAuth 相关；必要时新增守卫用例）
- 不改 `@growth-os/types` 契约（复用既有 `ApiErrorEnvelope`），不改服务端任何端点行为
- 不触碰 harness 资产（`.trae/`、`.agents/`、AGENTS.md）
- 用户可见行为变化：token 过期后操作自动回登录页（而非僵尸态）；服务器故障时看到可重试错误态（而非误导性"重新登录"文案）
