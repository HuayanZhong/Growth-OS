# Agent Note: dev 启动修复（strip-only 语法与 forFeature contextName）

Status: implemented

## Problem

`pnpm dev` 首次暴露两类只有真实启动才会踩的坑（vitest/tsx 用 esbuild/swc 转译、e2e 用 ORM 桩，均不覆盖）：

1. Node 24 直接加载 `@growth-os/shared` 源码（strip-only 类型剥离）报 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`：`ProjectionError`/`EventVocabularyError` 的 constructor 用了 parameter property——该语法需要代码生成，strip-only 模式不支持。
2. `MikroOrmModule.forFeature` 生成的 repository provider 注入失败：mikro-orm.config 声明 `contextName: 'default'` 后，forRoot 导出的 EM token 是 `default_EntityManager`（字符串），而 forFeature 未带同名 contextName 时按 `EntityManager` 类 token 注入，启动即崩。另外 `TurnService` 的 `@Inject(LLM_ADAPTER)` 因 SessionsModule 未 import LlmModule 同样崩。

## Decision

- **shared 包源码保持 strip-only 兼容**：不用 parameter property（也不得用 enum/namespace），类字段显式声明 + constructor 内赋值。源码直引的两个包（shared/types）都受此约束。
- **forFeature 与 forRoot 的 contextName 必须一致**：五个域模块统一 `forFeature([...], 'default')`，机制说明写在 agents.module.ts 注释（one fact, one home）。
- SessionsModule imports 补 LlmModule（TurnService 的 LLM_ADAPTER 依赖）。

## Alternatives considered

- server dev 脚本加 `NODE_OPTIONS=--experimental-transform-types` 绕过 strip-only：弃。转译模式改变运行时语义面，且约束不了后续再犯；源码侧约束更根本。
- 移除 forFeature（entity 由 config glob 提供、repository 无消费方）：弃。保留 Nest 侧实体注册显式性，后续接 @InjectRepository 时是必需品。

## Consequences

- 新增 shared 类/新域模块时按上述约束走；漏挂目前无静态检查（同 ZodValidationPipe 挂载，依赖评审）。
- e2e 桩装配不覆盖 ORM provider 图，域模块装配错误只有真实启动能暴露。
