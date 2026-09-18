# Agent Note: auth/login 登录端点（Supabase password grant 代理）

Status: implemented

## Problem

API 调试客户端（Apifox）调用受保护端点时，每个接口都要手动粘贴 Supabase access token；token 一小时过期后还得去前端登录一次重新取。需要一个后端登录入口，让客户端（Apifox 调试、后续前端 typed client）用邮箱密码换取 token 并注入全局变量。

## Decision/Proposal

新增公开端点 `POST /api/v1/auth/login`（[auth.controller.ts](../../../apps/server/src/modules/auth/auth.controller.ts)）：

- `@Public()` 豁免 JWT Guard，全局 ThrottlerGuard 仍然覆盖（限流先于鉴权，见 AppModule）；凭据校验委托 Supabase Auth。
- 新增 [AuthService](../../../apps/server/src/modules/auth/auth.service.ts) 用原生 `fetch` 代理 Supabase password grant（`POST {url}/auth/v1/token?grant_type=password`），与 JwtVerifierService 的探针路径保持同一姿势。
- 响应只映射 Authorization 头需要的最小字段 `LoginResult { accessToken, tokenType, expiresIn, user }`，`refresh_token` / `user_metadata` 不透传；契约入 `@growth-os/types`（`AuthApiMap` 扩展）。
- 错误统一 401 信封：400（凭据错误）→「邮箱或密码不正确」；上游限流/网络故障 → 通用文案 + warn 日志，不放大为 500、不泄露上游细节。
- URL 解析链（`SUPABASE_URL → NUXT_PUBLIC_SUPABASE_URL`）从 JwtVerifierService 抽为模块内共享的 [supabase-url.ts](../../../apps/server/src/modules/auth/supabase-url.ts)，两个服务共用。

## Alternatives considered

- **Apifox 直连 Supabase `/auth/v1/token`（零后端改动）**：拒绝——登录契约应收敛到自有 API 面（`AuthApiMap`），前端 typed client 后续也要复用；让调试客户端各自直连上游会把 Supabase URL/anon key 散布到工具配置里。
- **服务端引入 `@supabase/supabase-js` 调用登录**：拒绝——它目前只是 server 的 devDependency（e2e 用），进生产代码需迁移依赖；且 SDK 与现有 verifier 的原生 fetch 姿势不一致。
- **透传完整 Supabase session**：拒绝——refresh_token 属长期凭证，调试场景不需要，透传扩大泄露面；后续 session 管理域需要时再显式扩展契约。

## Consequences

- Apifox 里登录一次即可全局注入 token（响应经信封包装，token 在 `body.data.accessToken`）。
- 登录端点成为暴力破解目标面：依赖全局限流（60s/100 次缺省）+ Supabase 自身 auth 限流兜底；收紧到独立限额待有真实攻击面再议。
- `@growth-os/types` 的 `AuthApiMap` 新增成员为增量变更，前端现有消费方（login.vue 仅用 `loginSchema.shape`）不受影响。
