# Proposal: add-github-sso

## Why

登录页目前只有邮箱密码登录，第三方按钮（QQ/微信）是占位。微信/QQ 的开放平台资质（企业主体、ICP 备案域名、审核）短期拿不到，而 GitHub 是 Supabase Auth 原生支持、零资质、零费用的 provider，且与 Growth OS 的目标用户（AI/开发者人群）高度匹配。接入 GitHub 后用户可以免注册一键登录，同时打通 Electron 端 OAuth 窗口流程，为未来接入其他 provider 复用。

## What Changes

- 登录页第三方登录区：**微信按钮替换为 GitHub 按钮**，点击发起真实的 GitHub OAuth 登录（`supabase.auth.signInWithOAuth({ provider: 'github' })`）
- 新增 Electron OAuth 窗口流程：主进程创建次级 `BrowserWindow` 加载授权页，拦截重定向取回回调 URL，渲染进程完成 Supabase 会话建立，此后复用现有 secureStorage 持久化与路由守卫路径
- `IpcChannelMap` 新增一个 OAuth 窗口通道（types / main / preload 三端扇出）
- Supabase 客户端启用 PKCE flow（`flowType: 'pkce'`，仅影响 OAuth 流程）
- **QQ 按钮保留现状占位**（点击无行为，等资质接入后走后端代理，不在本 change 范围）
- Supabase Dashboard 侧配置（手工任务）：启用 GitHub provider、登记 Redirect URLs

## Capabilities

### New Capabilities

- `auth-oauth-login`: 桌面端第三方 OAuth 登录能力——GitHub provider 全流程（授权窗口、回调拦截、会话建立、错误路径），以及第三方登录区按钮行为契约（GitHub 可用、QQ 占位）

### Modified Capabilities

（无——`openspec/specs/` 现有 `agent-harness`、`test-coverage` 均不受影响）

## Impact

- `packages/types`: `IpcChannelMap` 新增 OAuth 窗口通道条目（三端类型自动扇出）
- `packages/desktop-core`: 新增 `ipc/oauth-window.ts`（次级 BrowserWindow + 导航拦截）、`ipc/index.ts` 注册、`preload/index.ts` 暴露方法
- `apps/desktop`: `useSupabase.ts`（flowType）、`login.vue`（按钮替换 + onSso 实现）、新增 OAuth 处理 composable、`assets/icons/github.svg`
- `apps/server`: **不改动**（Supabase 签发的 session 由现有 SupabaseJwtGuard 直接验证）
- 依赖: 不新增
- Harness 资产（`.trae/`、`.agents/`、`AGENTS.md`）: **不涉及**（按 AGENTS.md 规则，随 change 附 thin pointer Agent Note）
- 外部配置（非代码）: GitHub OAuth App 创建、Supabase Dashboard GitHub provider 与 Redirect URLs 配置
