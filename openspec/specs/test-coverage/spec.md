## Purpose

让测试覆盖率可信且有约束力：coverage 报告只度量真实可执行源代码（排除资产、类型声明与生成物），且每个包声明强制基线，覆盖率倒退时验证失败。

## Requirements

### Requirement: Coverage 统计只度量可执行源

每个参与 `pnpm test:coverage` 的包 SHALL 将 coverage 统计范围限定为真实可执行源代码：静态资产（字体、CSS、SVG、图片）、类型声明文件（`.d.ts`）、无运行时导出的纯类型文件、纯 re-export 的 barrel 文件（`index.ts`）、自动生成的 migrations 与 seeders SHALL 被排除，不出现在覆盖率报告中。含真实运行时逻辑但未测的入口文件（如 bootstrap、preload）SHALL 保持度量，不得为抬高数字而排除。

#### Scenario: ui 报告不含字体资产

- **WHEN** 运行 `pnpm --filter @growth-os/ui test:coverage`
- **THEN** 报告中不出现任何 `.woff2`、`.css` 或 `env.d.ts` 条目，且组件与工具函数的覆盖数字可独立判读

#### Scenario: types 报告聚焦运行时 schema

- **WHEN** 运行 `@growth-os/types` 的 coverage
- **THEN** 纯类型文件不出现在报告中，报告反映 zod schema 等运行时代码的真实覆盖

#### Scenario: server 报告不含生成物

- **WHEN** 运行 `@growth-os/server` 的 coverage
- **THEN** `src/infra/database/migrations/**` 与 `src/infra/database/seeders/**` 不出现在报告中，业务模块的覆盖数字不被生成物稀释

### Requirement: 每包强制覆盖率基线

六个含测试的包（`apps/desktop`、`apps/server`、`packages/desktop-core`、`packages/ui`、`packages/types`、`packages/shared`）SHALL 各自在其 vitest 配置中声明 coverage 阈值（至少 lines 与 branches 两项）；任一实测值低于该包基线时，该包的 `vitest run --coverage` SHALL 失败（非零退出码）。基线数字 SHALL 记录在对应包自己的配置文件中，不引入共享参数化机制。

#### Scenario: 覆盖率倒退被拦截

- **WHEN** 对某包的改动使其 lines 或 branches 实测值跌破该包配置的基线
- **THEN** `pnpm test:coverage` 在该包任务上失败，turbo 汇总报告非零退出

#### Scenario: 达标时验证通过

- **WHEN** 所有包的实测覆盖率均不低于各自基线
- **THEN** `pnpm test:coverage` 六个任务全部通过

#### Scenario: 基线提升是显式变更

- **WHEN** 后续变更补齐测试并有意上调某包基线
- **THEN** 仅修改该包 vitest 配置中的阈值数字即可完成调升，无需改动共享测试配置
