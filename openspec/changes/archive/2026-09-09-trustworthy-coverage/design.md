# Design: trustworthy-coverage

## Context

2026-09-03 的 [ui-tests-and-coverage 笔记](../../../../.agents/notes/implemented/feature/2026-09-03-ui-tests-and-coverage.md) 把 coverage 工具按包制度化，并显式推迟了阈值门禁（"threshold gate 实际进 CI 时再做聚合"）——本变更即兑现该推迟决策。当日实测：shared 97.7%、desktop-core 88.1%、server 70.5%、desktop 58.5%、ui/types 数字失真。

当前各包 `coverage` 配置与噪音来源（2026-09-09 实测报告）：

| 包                      | include                          | 噪音                                                 |
| ----------------------- | -------------------------------- | ---------------------------------------------------- |
| `apps/desktop`          | `app/**`                         | `app/assets/**`（css/svg）、`app/types/desktop.d.ts` |
| `apps/server`           | `src/**`，exclude `**/*.test.ts` | `migrations/**`、`seeders/**`、`.gitkeep`            |
| `packages/desktop-core` | `src/** ipc/** preload/**`       | `src/types.ts`（纯类型）                             |
| `packages/ui`           | `src/**`                         | 约 125 个 `.woff2`、`styles/**`、`env.d.ts`、barrel  |
| `packages/types`        | `src/**`                         | 纯类型文件（adapters/events 等）混入分母             |
| `packages/shared`       | `src/**`                         | 仅 barrel `index.ts`，基本干净                       |

CI（[ci.yml](../../../../.github/workflows/ci.yml)）当前只跑 `pnpm turbo lint typecheck test`，不含 coverage —— 阈值若不接 CI 则只在本地生效。

## Goals / Non-Goals

**Goals:**

- 各包报告只度量可执行源；排除清单落在各包配置内，判定标准可复述
- 六包 lines + branches 强制基线，跌破即 `vitest run --coverage` 失败
- 阈值进入 CI 验证链，防倒退有牙齿

**Non-Goals:**

- 不提升覆盖率、不补任何测试（projects/skills service、helmet prod 分支、zod schema 是后续变更）
- 不改 `.trae/rules/frontend/tests/coverage.md`（阈值是既有"测行为"原则的机器兜底）
- 不做聚合报告（turbo 汇总已够用，沿用 2026-09-03 笔记的决策）
- 不动 `tooling/test/base.ts`（无共享逻辑可抽象，见决策 1）

## Decisions

1. **阈值与排除清单内联在各包 vitest.config.ts，不改 base.ts。** 六个包的基线天然不同（58%–98%），base.ts 参数化只省几行重复、引入间接层；且 spec 已约定"基线记录在对应包自己的配置"。每个配置加注释说明排除口径，补偿重复的可读性成本。替代方案（base.ts 导出 `withCoverage(config, thresholds)` helper）被否：一次性抽象，无第二消费者。

2. **排除按"扩展名 + 目录"双轨，统一片段 + 按包特例。** 统一片段：`**/*.d.ts`、`**/*.{css,svg,woff,woff2,png,jpg}`、`**/.gitkeep`、`**/index.ts`（纯 re-export barrel）。按包特例：server 加 `src/infra/database/{migrations,seeders}/**`；types 加已核实的纯类型目录；desktop-core 加 `src/types.ts`。**判定标准**：每个被目录排除的文件，实施时须确认"无运行时导出"（如 `src/utils/ipc-channels.ts` 若含运行时常量则保留度量），逐文件核对而非照抄本文清单。替代方案（types 改 include 白名单 `src/api/**`）被否：未来新增运行时文件会被静默漏测，default-measure + exclude 更安全。

3. **入口/引导代码不排除。** server 的 `main.ts`、`app.module.ts`，desktop-core 的 `src/main.ts`、`preload/index.ts` 保持度量 —— 0% 是诚实的债务信号，隐藏它们只为数字好看。替代方案（排除 bootstrap）被否。

4. **阈值只取 lines + branches，基线 = 实测值整数下限（floor）。** v8 provider 下 statements 与 lines 几乎重合、functions 波动大，两项足以捕捉倒退；floor 留出 <1% 的环境波动容差（CI 无 `.env` 时 desktop 走占位值，[vitest.config.ts](../../../../apps/desktop/vitest.config.ts#L30-L32) 已兜底）。不用 vitest 的 `thresholds.autoUpdate`：自动上调会把"防倒退"退化成"追认现状"，调升必须是显式 diff。实施顺序：改排除 → `pnpm test:coverage` 取实测 → 回填各包阈值 → 重跑确认六包绿。

5. **CI 接入：把 ci.yml 的 `pnpm turbo lint typecheck test` 改为 `pnpm turbo lint typecheck test:coverage`。** `test:coverage` 同样执行全部测试（含阈值检查），替换而非追加，避免整套测试跑两遍；turbo.json 已有该 task 的 `outputs: ["coverage/**"]` 与 inputs 配置，无需改 turbo。替代方案（追加独立 step）被否：纯浪费一倍测试时间。

## Risks / Trade-offs

- [基线过紧，CI 误报] → floor 容差 + 首跑若失败按实测微调一次并在 thin note 记录；不连锁调规则
- [`**/index.ts` 排除隐藏未来有逻辑的 index.ts] → 配置注释 + spec 措辞限定"纯 re-export"；审查时对新 barrel 保持警惕
- [types 排除清单误判运行时代码] → 决策 2 的逐文件核对步骤落在 tasks；拿不准就保留度量（多测无害）
- [desktop 的 nuxt 环境 transform 复杂，覆盖率数字对依赖版本敏感] → floor 容差吸收小幅波动；数字异常时优先怀疑排除清单而非调阈值

## Migration Plan

单分支实施，两个 commit：(1) 各包排除修正 + 阈值回填；(2) ci.yml 接入。全部是配置变更，无数据/依赖/运行时影响；回滚 = revert 对应 commit。

## Open Questions

（无 —— `ipc-channels.ts` 是否含运行时常量属实施期核对项，由决策 2 的判定标准处理，不影响方案与任务拆分。）
