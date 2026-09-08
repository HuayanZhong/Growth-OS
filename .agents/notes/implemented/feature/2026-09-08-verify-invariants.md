# Agent Note: verify-invariants（结构不变量门禁）

Status: implemented

## Problem

后端审查暴露的多类约束此前只有文字规则或注释，违反它们要等真实启动/运行时才暴露（dev 启动三类报错、forFeature contextName、strip-only parameter property），或依赖评审兜底（ZodValidationPipe 漏挂）。按"关键规则用可执行检查兜底"的仓库立场，把这些约束机器化。

## Decision

- 新增 `scripts/verify-invariants.cjs`（`pnpm verify:invariants`，零依赖、CommonJS，风格同 verify-docs），四个检查：
  1. `apps/server/src/modules` 所有 controller 的 `@Body`/`@Query` 必须挂 `ZodValidationPipe`；
  2. `MikroOrmModule.forFeature` 必须以第二参数重复 mikro-orm.config 的 contextName；
  3. `packages/shared`/`packages/types` 源码禁 parameter property 与 enum（Node strip-only 直接加载，代码生成语法运行时崩）；
  4. `apps/server/src` 禁 CJS API（`require`/`__dirname`/`__filename`），相对 import 必须带扩展名（ESM 运行时硬要求）。
- 行级豁免：违规行或其上一行带 `// invariant: skip` 放行（首个用例：files 上传端点的 multipart 原始 body，非 JSON 契约）。
- 接入三处：`pnpm verify:invariants` 脚本、CI（Verify docs 之后）、Husky pre-commit（lint-staged 与 verify-docs 之间）。
- 检查器有效性经过正负例验证：临时违规文件四类 6 处违规全部命中（并借此修掉 `\brequire\s*\(\b` 中 `( ` 后无词边界的漏报），删除后恢复 OK。

## Alternatives considered

- 并入 verify-docs：职责混淆——docs 门禁管文档，不变量管源码结构。
- oxlint 自定义规则承载：parameter property/enum 可覆盖，但 controller 挂载与 forFeature 是跨文件结构检查，超出 linter 单文件能力。
- AST 解析（typescript API）：更精确，但零依赖正则对本仓结构足够且误报可控；未来出现误报再升级。

## Consequences

- 新增不合规代码在 pre-commit/CI 即被拦截，不再依赖真实启动或评审。
- 合法豁免必须带 `invariant: skip` 注释，豁免面在 diff 中可见、可评审。
- `rg`/oxlint 的既有规则不受影响；knip 已把 `scripts/**/*.cjs` 视为 entry，新脚本不产生死代码噪音。
