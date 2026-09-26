# Design: AI 域骨架目录落盘

## Context

AI 域实施采用渐进切刀框架（S 立骨 → H1-H3 加厚 → L1-L2 通电，每刀一个风险源、独立验收），整体代码地图已与用户逐轮对齐：包层零新增（最小 workspace 原则），AI 域落在 `packages/types/src/ai/`（契约）与 `apps/server/src/modules/ai/`（引擎+算法+HTTP 面）两个家。决策基线：[2026-09-25 AI 架构骨架 note](../../../../.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md)（8 条锁定决策 + 图套件节）；详图映射见 `docs/diagrams/ai/`（七分区融合图 + 6 张 archify 详图）。本变更把该地图落盘为目录骨架，动机见 proposal。

## Goals / Non-Goals

**Goals:**

- 建立 AI 域骨架：`modules/ai/` 单层模块（与 auth/audit 同构）+ `graph/` 唯一子目录 + types/a2a/chat 组件目录，各含一行 README
- 各刀（S/H1/H2/H3/L1/L2）的落位规则无歧义：S 刀平铺文件；未来子域落位清单内嵌 ai/README.md，目录随文件量增长按 NestJS 子模块惯例引入

**Non-Goals:**

- 不写任何实现代码（`.ts`/`.vue` 文件、schema、controller 一律不建——归各自刀）
- 不安装依赖、不改 tsconfig/package.json/verify 脚本
- 不预建 `pages/agents.vue` 等文件级产物（文件是内容，目录是结构）

## Decisions

1. **两个家，不建 `packages/ai-core`**：纯逻辑（RRF/chunker/OKF 解析/熔断器）留在 server 各域目录。理由：当前无第二消费者，SSE 帧编解码约 20 行（S 刀进 `types/src/ai/chat-stream.ts`，与 schema 同文件内聚），为 20 行共享代码建包违背最小 workspace。**提取原则固化：包的提取时机 = 第二个真实消费者出现之时**（第二前端 → 前端逻辑提包；第二进程 → 纯逻辑提 ai-core；均记入设计基线，届时机械提取）。
2. **每目录一个一行 README，而非 `.gitkeep`**：git 不跟踪空目录，README 让结构可提交且自文档化；README 承载"职责 + 刀次 + 详图"三要素，等价于把代码地图落盘。README 是文档非代码，不触发 knip/hygiene/ESM 检查。
3. **平级散落，无聚合容器（2026-09-26 二次修正，替代初版"七分区复合树"与"ai/ 单层聚合"两版）**：第一版按融合图七分区建 31 目录复合树，第二版压成 `modules/ai/` 单层聚合——用户两次纠正：仓库惯例是**一个域 = 一个平级单层模块**（auth/audit/health/throttle 散落在 modules/ 下），AI 不设聚合容器。最终：AI 各域平级散落（chat/graph/model-provider 先行，session/agent-config/intent/knowledge/memory/rsi/observability 随各自刀加入），每模块单层 README。教训：**结构落盘以仓库既有惯例为最高约束；"别的模块都没有"就是否决理由，不需要更多论证**。
4. **`a2a/` 平级于 `modules/ai/`**：tech-spec §2.1 落点为 `modules/a2a/`（对外协议面，非 ai 内部域），保持平级预留。
5. **前端只建 `app/components/chat/`**：`pages/agents.vue`、`composables/use-agent-chat.ts` 是 S 刀文件级产物，骨架不预建。

## Risks / Trade-offs

- [散落后 AI 域边界不直观（十余个平级模块）] → 各模块名即域职责；落位次序与详图映射登记在骨架 note 代码地图节，各刀立项时引用
- [graph/ 内文件平铺后命名冲突] → patterns/tools/subagents 由文件前缀区分（如 `graph.tool.retrieval.ts`），膨胀到需要子目录时再收

## Migration Plan

目录 + README 纯增量，无迁移、无回滚需求（回滚 = 删除目录树）。验证：`pnpm verify` 三段全绿 + 目录树与本文档地图一致。
