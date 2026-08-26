# 身份鉴权详解：Supabase Auth + NestJS 验证设计（M1）

> 状态：方案设计（未实现）
> 相关文件：[ai-module-plan.md](ai-module-plan.md)（总方案）/ [auth-token-secure-storage-plan.md](auth-token-secure-storage-plan.md)（token 存储，已实现）
> 目标读者：想完整理解本项目鉴权链路的开发者。先讲清概念与流程，再落到组件设计。

---

## 一、为什么必须做后端鉴权

本项目有两类后端：

1. **Supabase 自家 API**（Auth/Data API/Storage）——supabase-js 每个请求自动附带 token，Supabase 的网关自己验证。这条链路**已经完成**。
2. **我们自己的 NestJS API**（AI 编排、会话、知识库）——它是独立的"资源服务器"。没有鉴权时，任何拿到 URL 的人都能裸调 `/api/v1/*`，白嫖 LLM Key、读写他人数据。

Supabase 只负责"签发身份"，**不提供替自有后端验证请求的中间件产品**。所以"我们的鉴权是 Supabase"只覆盖一半：签发归它，每次请求的验证归我们。

## 二、基础概念

### 2.1 JWT（JSON Web Token）是什么

一个 JWT 由三段 Base64URL 文本用 `.` 连接：

```
eyJhbGciOiJFUzI1NiJ9  .  eyJzdWIiOiJ1LTEyMyIsLi4uIn0  .  MEUCIQ...
        │                        │                        │
      header                  payload                  signature
   （算法+密钥ID）            （用户信息+过期时间）        （防篡改签名）
```

- header/payload 只是编码不是加密，**任何人都能读**（所以 payload 里绝不能放敏感数据）
- signature 由签发方私钥计算；改动 payload 任何一个字节，验签都会失败
- 这就是"身份证"：内容可见、伪造不了

### 2.2 Supabase 签发的 access_token 内容（claims）

| claim | 含义 | 本项目用途 |
|-------|------|-----------|
| `sub` | 用户唯一 UUID | **数据隔离的主键**：所有业务表带 user_id 与之对应 |
| `role` | Postgres 角色（恒为 `authenticated`） | 未来 RLS 策略依赖 |
| `exp` | 过期时间戳（秒） | Guard 校验项之一 |
| `iss` | 签发者 URL（`{项目}/auth/v1`） | 防其他 Supabase 项目的 token 冒用 |
| `email` 等 | 用户资料快照 | 直接可用，避免每请求查库 |

完整字段参考：Supabase 官方 JWT Claims Reference（`supabase.com/docs/guides/auth/jwt-fields`）。refresh_token 不是 JWT，只是一张"换新证凭据"，永远只存在于 secureStorage，不出现在业务请求里。

### 2.3 对称签名 vs 非对称签名（理解双轨策略的关键）

| | HS256（对称） | ES256/RS256（非对称） |
|---|---|---|
| 密钥结构 | 一把共享密钥：签发和验证用同一把 | 私钥签发 + 公钥验证，公钥可以公开 |
| 第三方能验证吗 | 能，但意味着把"能伪造一切证件的总钥匙"交出去了 | 天然适合：公钥只能验不能签 |
| Supabase 态度 | Legacy 系统，*No longer recommended* | 新项目默认，官方主推 |

结论：新项目拿公钥本地验（零网络往返）；老项目的 HS256 不能本地验签（等于分发伪造工具），官方给出的替代是"转问签发者本人"。

## 三、完整流程（三阶段）

```
── 阶段一：登录发证（已上线，不动）───────────────────────
用户输入邮箱密码 (/auth 页)
  └► useAuth().signIn() ─► supabase-js signInWithPassword ─► Supabase Auth
       ◄── access_token (~1h) + refresh_token
  └► session 经 secureStorage 加密落盘（Electron safeStorage）
  └► autoRefreshToken：过期前自动换新，业务代码无感

── 阶段二：前端携带（M1 新增 use-api.ts）──────────────────
页面调后端 apiFetch('/agents')
  ├► supabase.auth.getSession()          ← 要"当前有效 token"
  ├► headers.Authorization = Bearer <access_token>
  └► fetch(API_BASE_URL + '/api/v1/agents')

── 阶段三：服务端验证（M1 新增 Guard）─────────────────────
NestJS 请求管线：middleware ─► ★Guard★ ─► interceptor ─► pipe ─► controller
                                  │
  Guard 逐关检查：
  ├─ 路由带 @Public()？ ──────────► 放行（health 等公开端点）
  ├─ Authorization 缺失/格式错？ ─► 401 { code:'UNAUTHORIZED' }
  ├─ 解码 header.alg 分轨：
  │    ES256/RS256 ─► 本地 JWKS 公钥验签 + 校验 exp/iss
  │    HS256       ─► GET {url}/auth/v1/user（apikey+Bearer）→ 200 即有效
  ├─ 任一失败 ────────────────────► 401 信封（经 AllExceptionsFilter）
  └─ ✔ 通过：payload.sub/email 挂到 req.user
       └► controller 里 @CurrentUser() 注入
            └► 业务查询一律 WHERE user_id = user.id（未来 RLS 同源兜底）
```

## 四、验证策略：官方双轨

Supabase 官方《Verifying a JWT》指南明确给出两种姿势：

**主路径——JWKS 本地验签（ES256/RS256 项目，官方示例代码）：**

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose'

const PROJECT_JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
)
const { payload } = await jwtVerify(token, PROJECT_JWKS)
```

- JWKS = JSON Web Key Set，签发方公开的"有效公章目录"；每个公钥带 `kid`，与 token header 的 `kid` 匹配
- jose 内置缓存与轮换感知：Supabase 后台轮换密钥后无需改代码
- 注意缓存时效：Supabase 边缘缓存 10 分钟，官方建议轮换操作预留 ≥20 分钟窗口

**回退路径——HS256 legacy 项目：**

- 官方原文强烈反对在本地用共享密钥验签（*"We strongly recommend against this approach"*）：持有密钥即可伪造任意用户 token
- 官方推荐：`GET {url}/auth/v1/user` 带 `apikey` + `Authorization: Bearer <jwt>`，返回 200 即有效；随后安全地解码 payload 取 claims
- 本项目据此实现：**不引入 SUPABASE_JWT_SECRET 配置项**，从源头杜绝共享密钥落地

## 五、NestJS 组件设计

```
modules/auth/
├── auth.module.ts            # 注册 guard 为 APP_GUARD（官方全局注册姿势）
├── auth.controller.ts        # GET /auth/me —— 受保护探针（返回当前用户）
├── jwt-verifier.service.ts   # 双轨验证（上节），无状态可单测
└── supabase-jwt.guard.ts     # CanActivate：@Public 豁免 → 取头 → 验证 → 挂 req.user

common/decorators/
├── public.decorator.ts       # SetMetadata('isPublic', true)
└── current-user.decorator.ts # createParamDecorator：取 req.user 注入参数
```

要点：

1. **Guard 在 interceptor/pipe 之前执行**（Nest 请求管线顺序），未认证请求不触达任何业务代码
2. 全局注册用 `{ provide: APP_GUARD, useClass: SupabaseJwtGuard }` 而非 `useGlobalGuards()`——后者脱离 DI 容器无法注入 JwtVerifierService（Guards 官方指南明示）
3. 默认拒绝（deny by default）：新路由不加任何标记即受保护，公开能力必须显式 `@Public()`，防止遗漏
4. 验证失败抛 `UnauthorizedException({ code:'UNAUTHORIZED', message:'未登录或登录已过期' })`，由既有 AllExceptionsFilter 归一化为信封——错误链路复用，零新增约定
5. `AuthenticatedUser` 类型放 `src/shared/types/`（仅服务端内部消费，不进 packages/types——跨端契约才进 types 包）

## 六、失败场景矩阵

| 场景 | 拦截点 | 客户端表现 |
|------|--------|-----------|
| 未登录调接口 | 无 Authorization 头 → 401 | 提示登录 |
| token 被篡改 | 验签失败 → 401 | 同上 |
| token 过期且 refresh 失败 | exp 校验 → 401 | 引导重新登录 |
| 其他 Supabase 项目的 token | iss/kid 不匹配 → 401 | 同上 |
| `alg: none` 或未知算法 | 算法白名单外直接拒绝 → 401 | 同上 |
| 有效但访问他人数据 | 业务层 `user_id` 条件（M3 起）+ RLS（后续） | 数据不可见 |

## 七、前端配合与规则例外

- `use-api.ts` 是**唯一**允许手拼 `Authorization` 头的地方（token 规则"不得手拼"针对 Supabase API——那里 supabase-js 自动注入；自有后端必须手动携带）。实施时在该规则补一条例外说明
- 401 统一处理：ApiError(code='UNAUTHORIZED') 上抛，UI 层引导重登；不做静默重试（refresh 已由 supabase-js 负责，二次 401 说明会话真失效了）
- 服务端地址走 `NUXT_PUBLIC_API_BASE_URL`（默认 `http://localhost:4000`），dev/prod 可切换

## 八、安全清单

- [x] payload 不放敏感信息（JWT 内容可被任何人解码）
- [x] 日志脱敏：Guard/filter 记录用户 id 与路由，绝不落完整 token
- [x] 算法白名单：ES256/RS256 走 JWKS、HS256 走探针，其余（含 none）一律拒绝
- [x] 不落地共享密钥（无 SUPABASE_JWT_SECRET 配置面）
- [x] service_role/anon key 永不出现在服务端验证链路（anon key 仅作 HS256 探针请求的 apikey 头，本就是公开 publishable 性质）
- [ ] 时钟偏移容忍：jwtVerify 设 leeway（如 30s），实施时定参
- [ ] 生产 CORS 白名单（CORS_ORIGINS env，M1 一并实现）
- [ ] RLS 兜底（后续里程碑）：Guard 是应用层第一道门，RLS 是数据库层第二道，两层缺一不可

## 九、M1 实施清单与验收

**服务端**：env.validation 增补 `SUPABASE_URL`(可选，回退 `NUXT_PUBLIC_SUPABASE_URL`)、`CORS_ORIGINS`(可选)；`jose@^5` 入 catalog（v6 ESM-only 与 Jest CJS 不兼容）；上述五组件；main.ts CORS 收敛。

**测试**：
- 单测：guard（豁免/缺头/坏头/验证通过挂载 user）、verifier（算法分轨/JWKS 成功/HS256 探针成功与失败）
- e2e（官方 supertest 约定，`test/*.e2e-spec.ts`）：health 公开 200；`/auth/me` 无 token 401；带真实 token 200（用根 `.env` 的 `SUPABASE_TEST_EMAIL/PASSWORD` 现场登录取 token，凭证缺失时跳过）

**验收标准**：无 token 401 信封；有效 token 200 且返回 sub 与登录账号一致；`@Public()` 端点免验直通。

**桌面端**：`use-api.ts` + `use-api.test.ts`（同 commit 规则）；nuxt.config 增加 `apiBaseUrl`。
