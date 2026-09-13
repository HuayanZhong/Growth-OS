# Agent Note: OpenAPI 文档全面化与导出管道修复

Status: implemented

## Problem

Nest 12 升级后 Swagger 文档只剩空壳：`openapi.json` 的 `components.schemas` 为空、无任何 `requestBody`、路径参数缺失、endpoint 上没有 security 引用（配置了 `addBearerAuth` 但 UI 无锁图标）、无错误响应。原因有两层：

1. **TS type 运行时擦除**：controller 的请求/响应类型是 `@growth-os/types` 的 interface，`@nestjs/swagger` 无法反射，文档生成不出 schema。
2. **导出管道已损坏**：`openapi:export` 经 tsx（esbuild）加载 src，而 esbuild 的 emitDecoratorMetadata 不完整，Nest 12 DI 把 `TurnService` 的构造参数（SessionsService）解析为 undefined，`NestFactory.create` 即崩（`logger: false` 又把错误吞掉）。干净树上同样失败——与文档装饰器改动无关，是升级后的预存在回归。

## Decision/Proposal

- **schema 的运行时来源取自既有 zod schema**：server 新增 `src/common/openapi/schema.ts`，用 zod v4 原生 `toJSONSchema({ target: 'openapi-3.0', io })` 把契约里的 zod schema 转成 OpenAPI Schema Object，`@ApiBody`/`@ApiOkResponse` 直接消费；成功信封 `{ data: T }` 与 `ApiErrorEnvelope` 错误信封封装成 `ApiDataOk`/`ApiDataCreated`/`ApiErrorResponses` 复用装饰器。不引入 nestjs-zod 等第三方转换库。
- **实体 schema 落在 types 包**：`packages/types` 为各域实体补 zod schema（`agentSchema`/`projectSchema`/`skillSchema`/`sessionRecordSchema`/`messageSchema`/`sessionEventSchema`/`fileRecordSchema`/`auditLogSchema`/`forkSessionResultSchema`/`turnResultSchema`），实体 schema 从对应 create schema `.extend()` 派生（服务端生成字段覆盖为必填）。
- **实体类型单源化（`z.infer`）**：上述实体的 TS 类型一律 `export type X = z.infer<typeof xSchema>`，schema 是唯一事实源，无手写 interface 副本；事件词汇的字面量数组（`messageEventTypes`/`bookkeepingEventTypes`）同理——`SessionEventType` 与 `sessionEventSchema.type` 的 `z.enum` 均由同一数组派生。事件目录生成器（`generate-event-catalog.cjs`）的 `pickLiterals` 相应适配为同时识别内联联合与 as const 数组派生两种格式。`exactOptionalPropertyTypes` 未启用（已确认），optional 字段的 `z.infer` 推导（`?: T | undefined`）与原 interface 结构等价。
- **7 个 controller 补齐装饰器**：`@ApiBearerAuth`（health 除外，其为 `@Public`）、`@ApiParam`（路径参数）、`@ApiQuery`（audit 过滤参数）、`@ApiBody`、成功/错误响应；类级 `@ApiErrorResponses('401', '500')`——500 兜底对应 AllExceptionsFilter 对未捕获异常的统一归一化，全部 33 个操作已声明；files 上传按契约文档化为 multipart/form-data（file/name/mimeType）。
- **文档完备性经程序化审计复核**：逐 operation 检查字段完备性并与源码路由清单交叉比对（33 操作 / 18 路径，无遗漏）；补齐了 health check 向后兼容端点缺失的 200 schema（READINESS_OK_SCHEMA 与 readiness 共用）。
- **文档元信息收敛为单份**：`src/common/openapi/document.ts` 的 `buildOpenApiConfig()` 被 main.ts 与导出脚本共用，消除双处维护；main.ts 改用懒生成 document factory + `persistAuthorization`/`explorer`/排序等 UI 选项。
- **导出脚本改走编译产物**：`scripts/export-openapi.ts`（tsx + src）→ `scripts/export-openapi.mjs`（node + dist），与生产启动路径（`node dist/src/main.js`）同构，绕开 esbuild DI 缺陷；前置 `nest build`，脚本头注释说明原因。

## Alternatives considered

- **引入 nestjs-zod / @anatine/zod-openapi**：拒绝——zod v4 原生 `toJSONSchema` 已覆盖需求，且支持 `target: 'openapi-3.0'`，无需为文档引入新运行时依赖。
- **把实体接口改写为 `z.infer<typeof entitySchema>`（schema 单一事实源）**：首轮暂缓——`details?: unknown` 等字段的可选性语义在 zod 两侧有细微差异，回归面大；先以同文件共置 + openapi.json 入库 diff（drift 即 fail）控制漂移，随后（用户批准）在同变更内完成改写：typecheck 三端（types/server/desktop）验证结构等价，`z.unknown()` 的 `z.infer` 输出侧仍为必填键，无回归。
- **文档级 `addSecurityRequirements` 全局挂安全要求**：拒绝——会把免鉴权的 health 端点也标记为需要认证，与 `@Public` 语义冲突；按 controller 挂 `@ApiBearerAuth` 才准确。
- **导出脚本改用 ts-node / swc-node 运行 src**：拒绝——工具链再增一环；dist 同构路径零新依赖，且 `tsx` 在 server 依赖中的运行时角色仅剩此脚本（已由 node + dist 取代）。

## Consequences

- Swagger UI 现在有完整的请求体/响应体 schema、路径参数、过滤参数、auth 锁图标、按状态码的统一错误信封示例；openapi.json 从 ~400 行空壳变为完整契约产物。
- 契约改动单一事实源：实体字段只改 schema（`.extend()` 覆盖服务端字段），TS 类型经 `z.infer` 自动跟随；openapi.json 的 drift 检查因此收敛为"schema ↔ 文档"一层。`pnpm --filter server openapi:export`（先 `build`）后的 diff 是 review 的强制检查点。
- 导出脚本依赖 `dist/` 新鲜度：改了 controller/契约但忘 `build` 会导出旧文档；脚本头注释已写明前置。
- `server` 的 `tsx` 依赖及其 catalog 条目已移除（knip 判定未使用；mikro-orm CLI 在 Node 24 原生 type-strip 下加载 TS config，已实测 `mikro-orm:debug` 正常）。
- 收尾四问记录的摩擦项见 decay-audit backlog：Trae 终端 stderr 吞输出（本轮排障靠写文件探针法绕过）、event-catalog 行号引用随编辑漂移。
