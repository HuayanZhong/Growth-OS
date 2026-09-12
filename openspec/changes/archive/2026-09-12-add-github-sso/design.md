# Design: add-github-sso

## Context

动机见 proposal.md。设计基于以下已核实的现状（均为代码事实）：

- `packages/desktop-core` 无任何次级 `BrowserWindow`、`BrowserView`、`shell.openExternal`；主窗口创建仅 `bootstrap/window.ts` 一处
- 主→渲染**无事件推送机制**（无 `webContents.send`，preload 无订阅 API）；IPC 只有 invoke/handle 请求-响应模式，契约单源 `IpcChannelMap`（三端扇出点：types 的 map、`ipc/index.ts` 注册、`preload/index.ts` 暴露——`window.desktop` 类型自动跟随）
- 生产模式主窗口 `loadFile`（file://），dev `loadURL(localhost)`；OAuth 回调不依赖应用自身 origin，两种模式行为一致
- `runtimeConfig.public.siteUrl`（`NUXT_PUBLIC_SITE_URL`，已在 LaunchEnv 白名单）已声明但无消费方；`detectSessionInUrl: true` 已开启；supabase client 未设置 `flowType`（默认 implicit）
- 登录页 SSO 现状：`login.vue` 的 `onSso(provider: 'qq' | 'wechat')` 为 no-op 占位，微信按钮在模板 L181-190

相关既有决策（Agent Notes）：[2026-08-23-desktop-core-decoupling](../../../../.agents/notes/implemented/architecture/2026-08-23-desktop-core-decoupling.md)（bootstrap/ipc/preload 三模块布局，新通道实现放 `ipc/`）；[2026-08-25-server-m1-auth-guard](../../../../.agents/notes/implemented/architecture/2026-08-25-server-m1-auth-guard.md) 与 [2026-08-16-supabase-connection](../../../../.agents/notes/implemented/architecture/2026-08-16-supabase-connection.md)（Supabase JWT 双轨验证，对签发方式无感知）。

## Goals / Non-Goals

**Goals:**

- 一次设计、多 provider 复用的"OAuth 授权窗口" IPC 通道（GitHub 是第一个调用方，未来其他走 Supabase 原生 provider 的登录零窗口层改动）
- OAuth 会话与邮箱密码登录完全同构（同一 secureStorage 路径、同一守卫、同一 SupabaseJwtGuard）

**Non-Goals:**

- QQ 真实接入（需后端代理 + 资质，另行立项）
- 系统浏览器 + 自定义协议 deep link 流程
- web 浏览器版（纯浏览器）OAuth 分支
- 账号绑定/解绑 UI（已有邮箱用户关联 GitHub 身份，走 Supabase 原生 identity 机制，无 UI 需求暂不展开）

## Decisions

### D1: 授权窗口用次级 BrowserWindow，结果经 invoke 响应返回（不引入 push 机制）

新增 IPC 通道 `oauthWindow`（命名以实现为准）：

```
IpcChannelMap 新增:
request  = { authUrl: string; callbackOrigin: string }   // 授权页 URL + 回调匹配前缀
response = { callbackUrl: string }                        // 命中回调的完整 URL
```

流程：renderer 调 `window.desktop.oauthWindow(...)` → 主进程创建 `BrowserWindow` 加载 `authUrl` → 监听 `will-navigate` / `will-redirect`（及 `will-attach-webview` 拒绝），URL 以 `callbackOrigin` 开头即 `preventDefault` 并 resolve → 关窗返回 `callbackUrl`；窗口被用户关闭或超时 → 以结构化错误 reject。

- 备选"外部浏览器 + `growthos://` deep link"：需协议注册、`second-instance` 单实例转发、Windows 下协议注册权限，且体验断开——拒绝
- 备选"`webContents.send` + preload 订阅"：为一次性请求-响应流程新建推送基础设施——拒绝；invoke 响应天然承载结果与错误，与现有 5 通道同构

### D2: PKCE flow（`useSupabase.ts` 增加 `flowType: 'pkce'`）

`signInWithOAuth({ provider: 'github', options: { redirectTo, skipBrowserRedirect: true } })` 返回授权 URL（内含 PKCE challenge，verifier 存于 renderer 自己的 storage 即现有 secureStorage adapter）；回调 URL 带 `?code=`，renderer 调 `supabase.auth.exchangeCodeForSession(code)` 建会话。

- 备选"默认 implicit + 手动 `setSession`"：少一行配置，但 access/refresh token 经 URL fragment 传递，且需手动解析 fragment——PKCE 是 Supabase 对新实现的推荐路径，且 verifier 不过 URL
- 该配置只影响 OAuth 流程；`signInWithPassword` 等现有路径不受影响
- 实现首个任务需 spike 验证：verifier 经异步 secureStorage adapter 的写入/读取时序（BrowserWindow 关闭后 renderer 才交换，同一 client 实例，理论上无障碍）

### D3: redirectTo 用 `siteUrl`，回调按 origin+path 前缀拦截，不实际加载

`redirectTo = ${runtimeConfig.public.siteUrl}/auth`。Supabase 侧 Redirect URLs 白名单登记 siteUrl（prod）与 dev localhost；主进程拦截发生在导航完成前（`preventDefault`），该页面不会被真实加载——因此 file://（prod）与 http://localhost（dev）差异不影响流程。不引入自定义协议。

### D4: 授权窗口安全基线

次级 `BrowserWindow`：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`、不挂 preload（纯远程授权页）；导航白名单仅放行 GitHub 授权相关域与 Supabase 回调，其余拦截；`callbackUrl` 只作为 invoke 响应返回给 renderer，不写日志。回调 URL 含 code/token，遵守现有"敏感数据不落盘/不日志"的约定。

### D5: 前端接线

- `login.vue`：微信按钮（L181-190）替换为 GitHub 按钮（新增 `assets/icons/github.svg`，样式沿用 `btn-dash btn-block` 系列，配色用中性/基准 token，遵守 colors 规则）；`onSso` 联合类型改为 `'qq' | 'github'`
- 新增 OAuth 登录 composable（如 `useOAuthSignIn`）：`signInWithOAuth → oauthWindow → exchangeCodeForSession → 成功走与密码登录相同的 GSAP 离场 + navigateTo('/dashboard/agents')`；失败经 `mapAuthError` 中文化 toast；QQ 分支保持现状 no-op
- 加载态：GitHub 按钮请求期间禁用 + loading，防重复点击

### D6: 服务端零改动

Supabase 对 OAuth 用户签发同构 JWT（`sub` 为 Supabase user id），`SupabaseJwtGuard`/`JwtVerifierService` 无感知；`auth.users`/`auth.identities` 由 Supabase 原生管理，服务端 DB 依旧无用户表。

### D7: provider 预检（chrome-devtools 实测驱动的补充决策）

实测发现：provider 未在 Supabase 侧启用时，`signInWithOAuth` 仍正常返回授权 URL，导航后停在 `authorize` 端点的 400 裸 JSON 错误页（浏览器分支死胡同、无中文提示；Electron 分支则授权窗口卡在 JSON 页直到用户关窗或超时）。因此渲染层在发起授权前调用公开端点 `GET /auth/v1/settings` 预检 `external[provider]`：未启用直接抛 `oauth_provider_disabled` 并映射中文 toast，不导航；预检自身失败（非 2xx/网络异常）fail-open 放行，由真实授权环节自然报错，不在预检处制造新失败模式。备选"不做预检"被拒：失败暴露太晚（已导航/已开窗）且失败 UX 不可接受。

### 外部配置（手工前置，非代码）

1. GitHub OAuth App：Homepage URL = siteUrl，Callback URL = `https://<project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard：Authentication → Providers → GitHub 启用并填 Client ID/Secret；URL Configuration → Redirect URLs 增加 siteUrl 与 dev 地址
3. 验证方式：`GET {SUPABASE_URL}/auth/v1/settings` 响应中 `external.github === true`

## Risks / Trade-offs

- [PKCE verifier 与异步 secureStorage 时序未实测] → 实现首个任务做 spike；受阻则回退 implicit + 手动 `setSession`（仅改 `useSupabase.ts` 配置与解析代码，spec 行为不变）
- [浏览器分支授权被拒后回跳 /auth 带 error 参数，页面静默无提示] → 桌面端为主故未处理；provider 启用后实测再决定是否在 /auth 页补 error 参数中文提示
- [Electron 重定向拦截时序（`will-redirect` vs `did-navigate` 因 302/JS 跳转而异）] → 双钩子 + `callbackOrigin` 前缀匹配，桌面 `verify:build` 冒烟覆盖
- [GitHub 用户隐藏邮箱时 `email` 可能为 null] → Supabase 以 provider identity 建用户，现有服务端身份只依赖 `sub`（email 可选），无阻塞
- [用户中途关窗留下未消费的 PKCE verifier] → 无害（下次 `signInWithOAuth` 覆盖），无需清理逻辑
- [auth-oauth-login 行为将来被 QQ 后端代理复用时，spec 需扩展 provider 差异] → 当前 spec 按 GitHub + QQ 占位书写，扩展留待 QQ change

## Migration Plan

无数据迁移。部署顺序：先完成外部配置（GitHub OAuth App + Supabase Dashboard），再合入代码。回滚 = revert 提交即可（QQ 占位行为不受影响；Supabase Dashboard 的 provider 配置可保留，不影响邮箱密码登录）。

## Open Questions

- 授权窗口尺寸与居中细节（GitHub 授权页自适应，实现期按视觉微调，不阻塞）
