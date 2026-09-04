# Agent Note: turbo 缓存的依赖源码哈希与 envBoolString 语义修复

Status: proposed

## Problem

两处问题在同一次验证中发现：

1. **turbo 缓存的哈希不含内部依赖源码。** 本仓库所有 workspace 包直接以 `src/` 源码被消费（`main` 指向 `src/index.ts`，无 dist 产物），而 turbo 任务哈希默认只包含本包的 tracked 文件。实测：修改 `packages/shared/src/env.ts` 后，`server#test` 与 `server#typecheck` 的缓存哈希不变（同哈希命中），消费者会拿到陈旧的缓存结果——测试/类型检查绿灯不再可信。
2. **`envBoolString()` 的实现与注释意图相悖。** `z.coerce.boolean()` 的语义是 `Boolean(value)`，任何非空字符串（包括 `"false"`）都解析为 `true`。消费方 `apps/server/src/config/env.validation.ts` 的 `DB_DEBUG=false` 会意外开启调试。

## Decision/Proposal

1. `turbo.json` 的 `typecheck` / `test` 任务增加 `inputs: ["$TURBO_DEFAULT$", "../../packages/*/src/**", "../../tooling/**"]`：任何包源码或 tooling 配置变更都使所有包的检查任务缓存失效。所有包处于同一深度（`apps/*`、`packages/*`），相对路径 `../../packages/...` 对每个包解析一致。
2. `envBoolString()` 改为 `z.enum(['true','false','1','0']).transform(...)`：仅接受四种字面量并显式映射为 boolean，其余值 fail-fast，与注释宣称的语义一致。
3. 补齐 `packages/shared`（env/normalize，27 用例）与 `packages/types`（auth schema，5 用例）的 co-located 单测（`src/*.test.ts`，沿用 server 的约定），两包获得 `test` script 与 vitest 依赖。

## Alternatives considered

- **依赖 turbo 默认哈希**（现状）：被实测否定——默认不含内部依赖源码，缓存会掩盖跨包回归。
- **`globalDependencies: ["packages/*/src/**"]`**：效果等同，但影响所有任务（含 build/lint）的哈希；文档明确建议优先用任务级 `inputs` 而非全局依赖，故弃。
- **每包独立 `turbo.json` 实现精确失效**（如 ui 变更不失效 server）：最精确但引入 6 份配置文件。当前全量真实执行仅 ~17s，CI 冷缓存下过度失效无代价，精确化收益不抵配置膨胀；包数量或耗时显著增长时再评估。
- **保留 `z.coerce.boolean()` 并按实际行为写测试**：会把 `"false" → true` 固化为契约，与注释和调用方意图相悖，等于给 bug 上锁。
- **测试按注释意图写、实现不改**：留下永久红灯套件，不可接受。

## Consequences

- `test` / `typecheck` 的缓存失效范围从"本包文件"扩大到"全仓库包源码 + tooling"。local 开发中改任意包源码会重跑所有包的检查（~17s），换取跨包缓存正确性。
- `DB_DEBUG=false` 的解析结果从 `true`（bug）变为 `false`（意图）；未配置时仍为 `undefined`，行为不变。
- `packages/shared` 与 `packages/types` 进入 turbo test 任务图，测试随 `pnpm test` 全量执行。
