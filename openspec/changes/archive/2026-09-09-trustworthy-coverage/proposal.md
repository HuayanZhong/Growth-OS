# 可信的测试覆盖率（报告修正 + 阈值防倒退）

## Why

2026-09-09 的全仓覆盖率探索发现两个结构性问题：其一，`ui` / `types` / `desktop` 等包的 coverage `include` 把字体（约 125 个 woff2）、CSS、SVG、`.d.ts`、barrel 文件计入分母，报告数字严重失真（ui 显示 "100%" 实为资产噪音；types 显示 21.4% 混入大量纯类型文件），无法据此判断真实覆盖；其二，所有 vitest 配置均无 `coverage.thresholds`，覆盖率下降不会导致任何检查失败，防倒退完全靠自觉。

## What Changes

- 修正 coverage 统计口径：各包 vitest 配置排除非可执行源（资产、类型声明、纯类型文件、barrel 文件、自动生成的 migrations/seeders），使报告只反映真实可执行逻辑
- 为全部 6 个有测试的包（desktop、server、desktop-core、ui、types、shared）添加 `coverage.thresholds` 基线（lines + branches），基线取修正后实测值的整数下限 —— 防倒退，不强制提升
- 基线数字记录在各包 vitest 配置内（单一事实源），design.md 记录基线确定方法与调升流程

**明确不在范围内**（留待后续变更）：补 projects/skills service 未测方法、helmet prod 分支、types zod schema 直接测试 —— 阈值先固定现状，提升覆盖是另一个变更的事。

## Capabilities

### New Capabilities

- `test-coverage`: 测试覆盖率的统计口径与强制基线 —— coverage 报告只度量可执行源代码（排除资产/类型/生成物），各包设 lines + branches 阈值，低于基线时 `pnpm test:coverage` 失败

### Modified Capabilities

（无 —— 现有唯一规格 `agent-harness` 面向 .trae/.agents harness 资产，与本变更无关）

## Impact

- **不触及 harness 资产**：`.trae/`、`.agents/`、`AGENTS.md` 均无改动；`.trae/rules/frontend/tests/coverage.md` 的既有原则（测行为不测实现、UI 壳可不测）不受影响，阈值是其机器兜底而非规则改写
- **层级映射**（仅测试配置，无运行时代码变更）：
  - `tooling/test/base.ts` — 不改（阈值按包差异内联在各自配置，不为 6 个包引入参数化间接层）
  - `packages/ui`、`packages/types`、`packages/desktop-core`、`apps/desktop`、`apps/server`、`packages/shared` — 各自 vitest.config.ts 的 `coverage` 块
- 无新依赖、无 API/行为变更；`pnpm test:coverage` 在低于基线时失败并进入 CI/pre-commit 既有验证链
- 风险：阈值定得过高会让后续正常重构误报 —— 以"实测值整数下限"为准并留调升流程（design.md）
