# 2026-08-25 — M1 鉴权骨架落地（Supabase JWT 双轨验证）

**日期**: 2026-08-25
**范围**: `apps/server`、`apps/desktop`、`packages/types`（无）、`.trae/documents`
**状态**: 已实现

## Problem

自有 NestJS API 是独立资源服务器，任何拿到 URL 的人可裸调 `/api/v1/*`。需要为所有路由建立默认拒绝的鉴权，同时保持公开端点能力，并给前端一个统一的请求入口。

## Decision

1. **双轨验证**（Supabase 官方《Verifying a JWT》姿势）：`JwtVerifierService` 解码 token header 按算法分流——ES256/RS256 等非对称密钥走 JWKS 本地验签（`createRemoteJWKSet` + `jwtVerify`，clockTolerance 30s）；legacy HS256 不本地验签（官方强烈反对共享密钥落地），改调 Auth 服务器 `GET /auth/v1/user` 探针（apikey 头用 anon key），200 即有效后安全解码 payload。
2. **默认拒绝**：`SupabaseJwtGuard` 经 `APP_GUARD` 全局注册，所有路由默认要 Bearer token；公开端点必须显式 `@Public()`（`SetMetadata('isPublic')`）。注册用 `useExisting` 而非 `useClass`，保证测试时可整体覆写 Guard（NestJS 官方 testing 指南建议）。
3. **错误链路复用**：Guard/Verifier 抛 `UnauthorizedException({ code, message })` 信封对象，由既有 `AllExceptionsFilter` 透传——零新增错误约定。
4. **URL 回退链**：`SUPABASE_URL` → `NUXT_PUBLIC_SUPABASE_URL` → 拒绝（服务端无需新增必填 env）；anon key 复用前端同名变量（publishable 性质）。
5. **前端单入口**：`useApi.ts` 的 `apiFetch()` 是唯一允许手拼 `Authorization` 头的位置（token 规则针对 Supabase API 的例外点），非 2xx 统一抛 `ApiError(status, envelope)`。

## Alternatives considered

- **supabase-js 服务端 getUser()**：每请求一次跨区域网络往返，官方定位是客户端 SDK，否决。
- **jsonwebtoken + SUPABASE_JWT_SECRET**：legacy HS256 本地验签，等于把"可伪造任意用户身份的密钥"放进服务端配置面，且 Supabase 标注 No longer recommended，否决。
- **jose v6**：ESM-only，Jest CJS 运行时无法加载；选 v5.10.0（双格式，API 一致）。生产运行不受影响——Node ≥24 支持 require(ESM)，MikroORM v7 同理。
- **e2e 引入完整 AppModule**：MikroORM ESM-only 包在 Jest 自有模块系统下不可 require，且 M1 被测端点不触达数据库；改为 `test/e2e-app.ts` 装配轻量模块（env 校验 + AuthModule + HealthModule + AllExceptionsFilter 镜像 AppModule）。DB 端点出现（M2/M3）时需重估：候选方案 transformIgnorePatterns 白名单或起真实进程打 http。

## Consequences

- 新增全局依赖顺序：任何 controller 自动受保护，遗漏 `@Public()` 的公开端点会 401——由 e2e health 用例守护。
- e2e 与 main.ts 的全局设置（前缀/版本）存在两处镜像（`test/e2e-app.ts`），bootstrap 变更需同步，已在注释中标注。
- HS256 项目下每个请求多一次 Auth 服务器往返（官方接受的代价）；本项目 signing keys 为 ES256 时零额外网络开销（JWKS 由 jose 缓存）。
- 单测注意：jose mock 后 `jest.restoreAllMocks()` 会重置工厂实现，需重建；调用计数跨用例累积需 `clearAllMocks`。

## Verification

- `pnpm --filter server test`（23 例）/ `test:e2e`（4 例，含真实登录链路）
- `pnpm --filter desktop vitest run test/unit/use-api.test.ts`（6 例）
- `pnpm --filter server typecheck && pnpm --filter server build`
