# Agent Note: 服务端基建补齐——MikroORM 接入、zod 校验管道与统一错误信封

Status: implemented

## Problem

`apps/server` 只有 ConfigModule 和 MikroORM CLI 配置，ORM 从未接入 Nest 容器（任何模块都无法注入 `EntityManager`）；`common/` 下无校验管道与异常过滤器，REST 错误响应格式未定义。AI 模块（见 [.trae/documents/ai-module-plan.md](../../../.trae/documents/ai-module-plan.md)）开工前必须补齐这三块地基。

## Decision

1. **MikroORM 接入**：`AppModule` 中 `MikroOrmModule.forRoot(dbConfig)`，直接 import [mikro-orm.config.ts](../../../apps/server/mikro-orm.config.ts) 默认导出。MikroORM v7 起官方要求 `forRoot()` 显式传配置，官方指引即复用独立配置文件——CLI 与 Nest 运行时天然单一真相源，零漂移。`main.ts` 补 `enableShutdownHooks()`（官方要求，否则 SIGTERM 时连接不关闭）与 bootstrap 失败时非零码退出（端口占用不再静默假死）。
2. **DTO 校验**：`common/pipes/zod-validation.pipe.ts`，按路由 `@Body(new ZodValidationPipe(schema))` 使用，错误抛携带信封的 `BadRequestException`。
3. **错误信封**：全局 `AllExceptionsFilter` 把一切异常归一化为 `ApiErrorEnvelope { code, message, details? }`；信封类型定义在 [@growth-os/types](../../../packages/types/src/api/error-envelope.ts)（跨端契约归 types 包）。约定：成功响应返回裸 JSON，仅错误使用信封。

## Alternatives considered

- **运行时复制一份 ORM 配置给 forRoot** → 两处配置必然漂移，放弃。
- **class-validator + 全局 ValidationPipe** → catalog 中该依赖在 server 源码零使用，引入第二套校验体系违背仓库 zod 单栈现状；且 class DTO 与现有"schema 优先"风格不符，放弃（catalog 条目保留待清理）。
- **成功响应也包信封（TransformInterceptor 包 `{ code, data }`）** → 每个 controller 多一层样板，SSE 流式接口根本无法使用统一包裹，约定反而多一个例外；裸成功 + 信封错误更简单，放弃全包裹。
- **过滤器放 main.ts 用 `useGlobalFilters()`** → 无法注入依赖且脱离模块体系；改用 `APP_FILTER` provider 注册，可测可替换。

## Consequences

- 业务模块从此可直接构造注入 `EntityManager`（自 `@mikro-orm/postgresql` 导入）；实体经各模块 `forFeature([...])` 注册，配合 `autoLoadEntities` 生效（当前 CLI 配置未开启该项，首个实体落地时再评估是否启用）。
- 前端 `use-api` 可依赖固定错误结构做 toast/跳转分支；新增错误码只需扩展 filter 的映射表并同步前端处理。
- 启动失败退出码为 0 的隐患消除，为将来 Electron 以子进程方式监督服务端铺路。
