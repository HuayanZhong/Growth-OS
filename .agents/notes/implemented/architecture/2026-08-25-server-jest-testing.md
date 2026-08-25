# Agent Note: 服务端 Jest 测试基建

Status: implemented

## Problem

`apps/server` 没有任何测试脚本与运行器，`pnpm test` 静默跳过 server；AI 模块迭代（[方案](../../../.trae/documents/ai-module-plan.md)）要求每个里程碑带可验证的测试。团队决定沿用 Nest 官方默认的 Jest，而非前端已用的 Vitest——两套运行器按层分工。

## Decision

- **官方姿势接入**：Jest 30 + ts-jest 29（peer 兼容 TS 6）+ `@types/jest` 30，版本入 `pnpm-workspace.yaml` test catalog；配置块放 `apps/server/package.json` 的 `"jest"` 键（Nest 脚手架惯例），`rootDir: src`、`testRegex: .*\.spec\.ts$`。
- **测试文件同目录放置**：`.spec.ts` 与被测类同目录（Nest 官方单测约定）；`tsconfig.build.json` 本就排除 `**/*.spec.ts`，产物不受污染。e2e 未来按官方约定放 `test/` 目录用 `.e2e-spec.ts` 后缀。
- **两处适配本仓库特殊性**：
  - `moduleNameMapper` 把相对导入的 `.js`/`.ts` 后缀剥掉——源码使用 `.ts` 后缀导入（配合 `rewriteRelativeImportExtensions`），Jest 默认解析器不认这种后缀。
  - ts-jest `diagnostics.ignoreCodes: [151002]`——tsconfig 的 `module: NodeNext` 在非 isolatedModules 模式下触发该警告，仅测试域屏蔽，不动共享 tsconfig。
- **首批测试**：`ZodValidationPipe` 与 `AllExceptionsFilter` 的单元 spec（纯逻辑、隔离实例化，官方"isolated testing"风格），覆盖合法/非法/边界分支。

## Alternatives considered

- **Vitest 复用前端栈** → 用户明确否决：后端跟随 Nest 官方生态用 Jest，避免双框架心智混杂；且 `@nestjs/testing` 文档与脚手架全部以 Jest 为默认。
- **@swc/jest 替代 ts-jest** → 更快但需额外 swc 配置且装饰器元数据（`emitDecoratorMetadata`）支持不完整，未来 controller/guard 测试会踩坑；ts-jest 直接读项目 tsconfig，零重复配置。速度在当前测试规模下不是瓶颈。
- **独立 jest.config.ts 文件** → 官方脚手架默认放 package.json，少一个文件；将来配置膨胀再拆。

## Consequences

- `pnpm --filter server test` 可用，turbo `pnpm test` 从此包含 server。
- 写涉及数据库的集成测试前必读 MikroORM 官方 [Usage with Jest](https://mikro-orm.io/docs/usage-with-jest)：fake timers 会卡死 pg 连接池依赖的 `process.nextTick()`，需 `jest.useFakeTimers({ doNotFake: ['nextTick'] })` 或官方的 wrappedSpy 方案。
- 新传递依赖 `unrs-resolver`（oxlint/oxfmt 解析器）加入 `allowBuilds` 白名单。
