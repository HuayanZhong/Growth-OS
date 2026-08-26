# 后端基建方案（Server Infrastructure Plan）

> 状态：方案设计（未实现）
> 前置：M1 鉴权骨架已完成，ai-module-plan.md 已固化
> 范围：apps/server 生产级基础设施，覆盖 AI 模块上线前必须补齐的非功能性能力

---

## 一、现状 vs 缺口

| 能力 | 现状 | 对标项目 | 优先级 |
|------|------|----------|--------|
| 请求日志 | 仅 NestJS 内置 Logger（无请求关联、无响应耗时） | nestjs-pino（自动请求日志 + child logger） | 🔴 必须 |
| 请求 ID（correlation） | 无 | 自动随请求生成，贯穿日志链路 | 🔴 必须 |
| 请求超时 | 无（慢请求挂死） | 超时拦截器返回 408 | 🔴 必须 |
| 限流 | 无（IP 暴露） | @nestjs/throttler ThrottlerGuard | 🔴 必须 |
| 响应压缩 | 无 | compression 中间件 | 🟡 重要 |
| 健康检查（readiness） | 仅存活探针，无 DB 连通性 | 双层：liveness + readiness（含 DB ping） | 🟡 重要 |
| 成功响应信封 | 裸返回值 | ResponseTransformInterceptor 透传 | 🟡 重要 |
| 安全头 | 无 | Helmet 中间件 | 🟢 可选 |
| OpenAPI 文档 | 无 | @nestjs/swagger | 🟢 可选 |
| PostgreSQL statement_timeout | 未配置 | 连接级保护，防止慢查询打满连接池 | 🟢 可选 |

---

## 二、全局管道注册顺序（main.ts）

```
app.use(...compression)
app.use(helmet)          // 安全头（可选）
app.useGlobalInterceptors(
  // 1. 成功信封（最外层：包装 controller 返回值）
  // 2. 请求超时（最内层：catch TimeoutException → 408）
)
app.useGlobalGuards(
  // ThrottlerGuard（APP_GUARD 全局注册，通过 APP_GUARD provider）
  // SupabaseJwtGuard（APP_GUARD 全局注册，@Public 豁免）
)
app.useGlobalFilters(
  // AllExceptionsFilter（已存在，APP_FILTER 全局注册）
)
app.useGlobalPipes(
  // ZodValidationPipe（已存在，APP_PIPE 全局注册）
)
```

> **注意**：compression 和 helmet 通过 NestJS 中间件注册（`app.use()`），不需要 NestJS 模块。ThrottlerGuard 和 JwtGuard 都通过 `APP_GUARD` provider 注册，顺序由 NestJS 内部决定（ThrottlerGuard 在 JwtGuard 之前执行，限流先于鉴权）。

---

## 三、逐项设计

### 3.1 请求日志 + 请求 ID

**问题**：当前 NestJS 内置 Logger 无法关联请求上下文；排查问题需手动拼接 URL+时间戳。

**方案**：`nestjs-pino`（pino-http 封装，自动为每条日志附加 req.id + req.method + req.url + res.statusCode + res.responseTime）。

**选型理由**：
- 最成熟的 NestJS 日志库（16k+ stars），与 Express/Fastify 均兼容
- AsyncLocalStorage 自动传播请求上下文，无需手动传参
- 比 winston 轻量，JSON 输出对云端日志采集友好
- 开发环境 pino-pretty 人类可读

**配置**：

```ts
// AppModule
imports: [
  LoggerModule.forRoot({
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } },
      genReqId: (req) => req.headers['x-request-id'] as string ?? crypto.randomUUID(),
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',  // 健康探针不刷日志
      },
    },
  }),
]
```

**main.ts 改动**：

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true })
app.useLogger(app.get(Logger))  // nestjs-pino Logger 替换内置
```

**新增依赖**：`nestjs-pino`（catalog:backend）、`pino`（peer dep）

**文件**：
- 新增 `apps/server/src/main/logger.setup.ts`（可选：将 pinoHttp 配置抽离）
- 修改 `apps/server/src/app.module.ts`（imports 加 LoggerModule.forRoot）
- 修改 `apps/server/src/main.ts`（bufferLogs + useLogger）
- 修改 `apps/server/src/common/filters/all-exceptions.filter.ts`（注入 nestjs-pino Logger 替换 new Logger）

**验证**：
- `rg -n 'nestjs-pino' apps/server` 命中 LoggerModule.forRoot + main.ts
- 启动后 curl 任意端点，stdout 输出含 `req.id`、`res.statusCode`、`responseTime`
- curl `/api/v1/health` 不产生日志（autoLogging.ignore）

---

### 3.2 请求超时拦截器

**问题**：慢请求（LLM 流式响应卡死、DB 连接池耗尽）无限等待，最终 TCP 层才断开。

**方案**：自定义 NestJS 拦截器（`TimeoutInterceptor`），在 controller 方法执行超过阈值后抛 `RequestTimeoutException`，由 AllExceptionsFilter 转为 408 响应。

**配置**：
- 默认超时 30s（普通 REST）
- SSE 流式端点排除（通过 `@SkipTimeout()` 装饰器标记）
- 超时值可通过环境变量 `REQUEST_TIMEOUT_MS` 覆盖

**文件**：
- 新增 `apps/server/src/common/interceptors/timeout.interceptor.ts`
- 新增 `apps/server/src/common/decorators/skip-timeout.decorator.ts`
- 新增 `apps/server/src/common/interceptors/timeout.interceptor.spec.ts`
- 修改 `apps/server/src/app.module.ts`（providers 加 { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor }）

**验证**：
- `rg -n 'TimeoutInterceptor' apps/server/src/app.module.ts` 命中
- 单测：mock controller 返回 `firstValueFrom(timer(50_000))` → 断言抛出 RequestTimeoutException
- 单测：controller 方法带 `@SkipTimeout()` → 断言不抛异常

---

### 3.3 限流

**问题**：无 IP 级别请求频率保护，接口暴露给扫描器/DDoS。

**方案**：`@nestjs/throttler` ThrottlerGuard（APP_GUARD 全局注册）。

**配置**：
- 默认策略：60s 窗口内最多 100 次请求（桌面应用正常用量）
- 登录端点单独收紧：60s / 10 次（`@Throttle({ default: { limit: 10, ttl: 60_000 } })`）
- 健康探针豁免（`@SkipThrottle()`）
- 开发环境可通过 `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` 覆盖
- 存储：内存（单实例）；未来多实例部署时切换 Redis（`@nest-lab/throttler-storage-redis`）

**env 新增**：

```ts
// env.schema 新增
THROTTLE_TTL_MS: envIntString().optional(),  // 默认 60000
THROTTLE_LIMIT: envIntString().optional(),   // 默认 100
```

**文件**：
- 新增 `apps/server/src/modules/throttle/throttle.config.ts`（ThrottlerModule.forRootAsync 配置工厂）
- 新增 `apps/server/src/modules/throttle/throttle.module.ts`（Feature module，导入 ThrottlerModule.forRootAsync）
- 修改 `apps/server/src/app.module.ts`（imports 加 ThrottleModule）
- 修改 `apps/server/src/modules/health/health.controller.ts`（加 `@SkipThrottle()`）
- 修改 `apps/server/src/config/env.validation.ts`（加 THROTTLE_TTL_MS、THROTTLE_LIMIT）
- 修改 `.env.example`（加 THROTTLE_TTL_MS、THROTTLE_LIMIT 说明）

**新增依赖**：`@nestjs/throttler`（catalog:backend）

**验证**：
- `rg -n 'ThrottlerModule\|ThrottlerGuard' apps/server/src` 命中 throttle module + app.module
- 单测：快速连续调用 N+1 次 → 断言第 N+1 次返回 429 + `RATE_LIMITED`
- `/api/v1/health` 不被限流

---

### 3.4 响应压缩

**问题**：JSON 响应（尤其是历史消息列表、知识库搜索结果）未压缩，桌面端网络传输浪费带宽。

**方案**：Express 内置 `compression` 中间件（gzip/deflate 自动协商）。

**配置**：
- 仅压缩 ≥1KB 的响应（小响应压缩反而增大体积）
- 排除 SSE 端点（流式响应已逐块发送，压缩会缓冲）

**文件**：
- 新增 `apps/server/src/main/compression.middleware.ts`（中间件工厂，条件排除 SSE）
- 修改 `apps/server/src/main.ts`（`app.use(compression(...))`）
- 新增 `apps/server/src/main/compression.middleware.spec.ts`

**新增依赖**：`compression` + `@types/compression`（catalog:backend）

**验证**：
- curl 带 `Accept-Encoding: gzip` → 响应头含 `Content-Encoding: gzip`
- SSE 端点响应不含 `Content-Encoding: gzip`

---

### 3.5 健康检查双层（Liveness + Readiness）

**问题**：当前 `/health` 仅返回 `{ status: 'ok' }`，不验证 DB 连通性；Kubernetes/负载均衡器无法判断应用是否真正可用。

**方案**：双端点设计：
- `GET /health/liveness`（`@Public`）：存活探针，无外部依赖，返回 200 即可
- `GET /health/readiness`（`@Public`）：就绪探针，验证 DB 连通性（MikroORM `em.getConnection().execute('SELECT 1')`）

**配置**：
- readiness 失败返回 503 + `ApiErrorEnvelope { code: 'SERVICE_UNAVAILABLE', message: '数据库连接异常' }`
- readiness 检查超时 5s（防止 DB 挂死时探针卡住）
- 保留原有 `GET /health` 作为向后兼容（等价于 readiness）

**文件**：
- 修改 `apps/server/src/modules/health/health.controller.ts`（新增 liveness/readiness 端点，保留原 check()）
- 新增 `apps/server/src/modules/health/health.service.ts`（封装 DB ping）
- 新增 `apps/server/src/modules/health/health.service.spec.ts`
- 修改 `apps/server/src/modules/health/health.module.ts`（providers 加 HealthService）

**验证**：
- `GET /health/liveness` → 200 `{ status: 'ok' }`
- `GET /health/readiness` → 正常 200 `{ status: 'ok', db: 'connected' }`
- mock MikroORM 连接失败 → readiness 返回 503

---

### 3.6 成功响应信封（ResponseTransformInterceptor）

**问题**：当前 controller 返回裸值（如 `{ status: 'ok' }`），前端需要知道哪些字段是业务数据、哪些是元数据。错误已有 `ApiErrorEnvelope`，但成功路径无统一包装。

**方案**：自定义 NestJS 拦截器，将所有成功响应包装为 `{ data: <原始返回值> }`（`ApiResponse<T>`）。

**设计决策**：
- 与 `ApiErrorEnvelope` 对称：错误 `{ code, message, details? }`，成功 `{ data }`
- SSE 端点排除（流式响应由 controller 直接操作 res 对象，不走拦截器返回值）
- 不修改 AllExceptionsFilter（错误路径保持不变）

**文件**：
- 新增 `apps/server/src/common/interceptors/response-envelope.interceptor.ts`
- 新增 `apps/server/src/common/interceptors/response-envelope.interceptor.spec.ts`
- 修改 `apps/server/src/app.module.ts`（providers 加 { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor }）

**验证**：
- `GET /api/v1/health` → `{ data: { status: 'ok' } }`
- 错误响应保持 `{ code, message }` 不变
- SSE 端点（带 `text/event-stream` Accept）不被包装

---

### 3.7 安全头（Helmet）（可选）

**问题**：无安全响应头（X-Content-Type-Options, X-Frame-Options 等）。

**方案**：Express `helmet` 中间件。

**配置**：
- 默认策略（contentSecurityPolicy 关闭，因为桌面端 file:// 协议与 CSP 冲突）
- 开发环境可选禁用

**文件**：
- 新增 `apps/server/src/main/helmet.middleware.ts`
- 修改 `apps/server/src/main.ts`（`app.use(helmet(...))`）

**新增依赖**：`helmet` + `@types/helmet`（catalog:backend）

**验证**：
- curl 响应头含 `X-Content-Type-Options: nosniff`

---

### 3.8 OpenAPI / Swagger（可选）

**问题**：无 API 文档，前后端协作需口头沟通契约。

**方案**：`@nestjs/swagger`（官方模块，装饰器驱动）。

**配置**：
- 仅在非生产环境挂载（`/docs` 路由）
- 全局 API key 声明（Bearer token）
- 基础路径 `/api/v1`

**文件**：
- 修改 `apps/server/src/main.ts`（SwaggerModule.setup + 快速 API 配置）
- 各 controller 方法加 `@ApiOkResponse` / `@ApiBearerAuth` 装饰器（渐进式，不一次性全加）

**新增依赖**：`@nestjs/swagger`（catalog:backend）

**验证**：
- 非生产环境 `GET /docs` → Swagger UI 渲染
- 生产环境 `GET /docs` → 404

---

### 3.9 PostgreSQL statement_timeout（可选）

**问题**：慢查询可无限执行，耗尽连接池。

**方案**：通过 MikroORM 的 `driverOptions.connection.options` 注入 `statement_timeout: 10000`（10s）。

**配置**：
- 仅在生产环境生效（开发环境允许慢查询调试）
- 可通过 `DB_STATEMENT_TIMEOUT_MS` 环境变量覆盖

**env 新增**：

```ts
DB_STATEMENT_TIMEOUT_MS: envIntString().optional(),  // 默认 10000
```

**文件**：
- 修改 `apps/server/mikro-orm.config.ts`（connection.options 加 statement_timeout）
- 修改 `apps/server/src/config/env.validation.ts`（加 DB_STATEMENT_TIMEOUT_MS）

**验证**：
- `SHOW statement_timeout` 返回配置值
- 模拟慢查询 → 超时后返回错误而非无限等待

---

## 四、实施批次

### 第一批（🔴 必须）— 预计 1-2 天

1. **请求日志 + 请求 ID**（nestjs-pino）
2. **请求超时拦截器**（自定义）
3. **限流**（@nestjs/throttler）

依赖关系：日志先行（其他项的日志输出依赖 pino Logger），超时和限流可并行。

### 第二批（🟡 重要）— 预计 1 天

4. **响应压缩**（compression 中间件）
5. **健康检查双层**（liveness + readiness）
6. **成功响应信封**（ResponseEnvelopeInterceptor）

依赖关系：无强依赖，可并行。

### 第三批（🟢 可选）— 按需

7. **Helmet 安全头**
8. **Swagger / OpenAPI**
9. **PostgreSQL statement_timeout**

依赖关系：无强依赖，按业务需要随时加入。

---

## 五、新增依赖汇总

| 包名 | 版本范围 | 分类 | 说明 |
|------|----------|------|------|
| `nestjs-pino` | catalog:backend | 生产 | 请求日志 + 请求 ID |
| `pino` | ^9（peer of nestjs-pino） | 生产 | 日志引擎 |
| `pino-pretty` | ^13（devDep） | 开发 | 开发环境日志美化 |
| `@nestjs/throttler` | catalog:backend | 生产 | 限流 |
| `compression` | ^1.7 | 生产 | 响应压缩 |
| `@types/compression` | ^1.7 | 开发 | 类型 |
| `helmet` | ^8 | 生产（可选） | 安全头 |
| `@types/helmet` | ^0.0.9 | 开发（可选） | 类型 |
| `@nestjs/swagger` | ^11 | 生产（可选） | OpenAPI 文档 |

---

## 六、文件清单（按批次）

### 第一批

| 操作 | 路径 |
|------|------|
| 修改 | `apps/server/src/app.module.ts`（加 LoggerModule、ThrottleModule、TimeoutInterceptor） |
| 修改 | `apps/server/src/main.ts`（bufferLogs、useLogger） |
| 修改 | `apps/server/src/config/env.validation.ts`（THROTTLE_TTL_MS、THROTTLE_LIMIT） |
| 修改 | `apps/server/src/common/filters/all-exceptions.filter.ts`（注入 nestjs-pino Logger） |
| 修改 | `.env.example`（加 THROTTLE_* 说明） |
| 新增 | `apps/server/src/modules/throttle/throttle.module.ts` |
| 新增 | `apps/server/src/modules/throttle/throttle.config.ts` |
| 新增 | `apps/server/src/common/interceptors/timeout.interceptor.ts` |
| 新增 | `apps/server/src/common/decorators/skip-timeout.decorator.ts` |
| 新增 | `apps/server/src/common/interceptors/timeout.interceptor.spec.ts` |
| 新增 | `apps/server/src/modules/throttle/throttle.module.spec.ts` |
| 修改 | `pnpm-workspace.yaml`（backend catalog 加 nestjs-pino、@nestjs/throttler、pino、pino-pretty） |

### 第二批

| 操作 | 路径 |
|------|------|
| 修改 | `apps/server/src/app.module.ts`（加 ResponseEnvelopeInterceptor） |
| 修改 | `apps/server/src/main.ts`（app.use(compression(...))） |
| 修改 | `apps/server/src/modules/health/health.controller.ts`（liveness/readiness） |
| 修改 | `apps/server/src/modules/health/health.module.ts`（providers） |
| 新增 | `apps/server/src/modules/health/health.service.ts` |
| 新增 | `apps/server/src/modules/health/health.service.spec.ts` |
| 新增 | `apps/server/src/common/interceptors/response-envelope.interceptor.ts` |
| 新增 | `apps/server/src/common/interceptors/response-envelope.interceptor.spec.ts` |
| 新增 | `apps/server/src/main/compression.middleware.ts` |
| 新增 | `apps/server/src/main/compression.middleware.spec.ts` |
| 修改 | `pnpm-workspace.yaml`（backend catalog 加 compression、@types/compression） |

### 第三批

| 操作 | 路径 |
|------|------|
| 修改 | `apps/server/src/main.ts`（app.use(helmet(...))、SwaggerModule.setup） |
| 修改 | `apps/server/mikro-orm.config.ts`（statement_timeout） |
| 修改 | `apps/server/src/config/env.validation.ts`（DB_STATEMENT_TIMEOUT_MS） |
| 新增 | `apps/server/src/main/helmet.middleware.ts` |
| 修改 | 各 controller（渐进式加 @ApiOkResponse / @ApiBearerAuth） |
| 修改 | `pnpm-workspace.yaml`（backend catalog 加 helmet、@nestjs/swagger） |

---

## 七、风险与对策

1. **nestjs-pino 与 NestJS 版本兼容性**：nestjs-pino v3 支持 NestJS 8-11，需确认最新版兼容 NestJS 11；实施时先 npm info 核对 peer deps
2. **限流与桌面端长连接冲突**：SSE 流式响应期间（可能持续数分钟）不应被限流计数——通过 `@SkipThrottle()` 标记 SSE controller 方法解决
3. **compression 与 SSE 冲突**：中间件必须在 SSE 端点路径上禁用压缩，否则流式输出被缓冲（响应头含 `Content-Encoding: gzip` 但浏览器 SSE parser 无法解压）——通过 `filter` 回调排除 `/ai/chat` 路径
4. **ResponseEnvelopeInterceptor 与 AllExceptionsFilter 交互**：拦截器只处理正常返回值，异常由 filter 处理，无冲突；但需确认 NestJS 执行顺序：拦截器（成功路径）→ filter（异常路径）互不干扰
5. **Helmet CSP 与 Electron file:// 协议**：`contentSecurityPolicy` 默认开启会阻止 file:// 加载的资源；解决：`helmet({ contentSecurityPolicy: false })` 或按环境配置

---

## 八、验证清单（每批次完成后）

```bash
# 单元测试
pnpm --filter server test

# 类型检查
pnpm --filter server typecheck

# Lint
pnpm --filter server lint

# E2E（需 Supabase 连通）
pnpm --filter server test:e2e

# 全仓验证
pnpm test && pnpm typecheck && pnpm lint

# 文档门禁
pnpm verify:docs
```
