# Agent Note: GitHub OAuth SSO（桌面端第三方登录）

Status: implemented

登录页第三方登录接入 GitHub（Supabase Auth 原生 provider，PKCE flow）：新增 `oauthWindow` IPC 通道（`packages/desktop-core/ipc/oauth-window.ts`，次级 BrowserWindow + 导航拦截，错误码契约在 `@growth-os/types`），渲染层经 `useOAuthSignIn` 完成 `signInWithOAuth → 授权窗口 → exchangeCodeForSession`，会话与邮箱密码登录同构（secureStorage 持久化、SupabaseJwtGuard 零改动）；微信按钮移除，QQ 按钮保留占位待开放平台资质。完整决策与备选方案见 [openspec/changes/archive/2026-09-12-add-github-sso](../../../../openspec/changes/archive/2026-09-12-add-github-sso/proposal.md)（proposal/design/specs/tasks）。
