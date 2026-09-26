# Proposal: AI 域骨架目录落盘（scaffold-ai-domain-skeleton）

Status: proposed

## Why

AI 域实施路径已归零重推导并与用户对齐：渐进切刀框架（S 立骨 / H1-H3 加厚 / L1-L2 通电）+ 整体代码地图（两个家：`packages/types` 契约 + `apps/server` 接线与引擎，最小 workspace 原则，不建 ai-core）。现在把代码地图落盘为真实目录结构：每域职责在仓库内自文档化，成为后续每一刀的落位基线。用户要求先看到骨架文件夹效果，零实现代码。

## What Changes

- AI 域拆为平级单层模块直接散落 `apps/server/src/modules/`（与 auth/audit 等既有模块完全同构，无聚合容器）：`chat/`（SSE 聊天面）、`graph/`（编排引擎）、`model-provider/`（模型接入）先行；session/agent-config/intent/knowledge/memory/rsi/observability 随各自刀加入
- 新建 `packages/types/src/ai/`（契约目录，S 刀起步）
- 新建 `apps/server/src/modules/a2a/`（平级预留，tech-spec 2.1 落点）
- 新建 `apps/desktop/app/components/chat/`（聊天组件目录）
- 每个新目录含一个一行 `README.md`：域职责 + 建立刀次（S/H1/H2/H3/L1/L2）+ 对应架构详图（docs/diagrams/ai/）
- **零实现代码**：不建任何 `.ts`/`.vue` 文件、不装依赖、不改任何配置

## Capabilities

### New Capabilities

（无——本变更为纯结构/文档落盘，无 spec 级行为变化，`.openspec.yaml` 已声明 `skip_specs: true`）

### Modified Capabilities

（无）

## Impact

- 影响层：`apps/server`（新增 modules/ai/、modules/a2a/ 目录树）、`packages/types`（新增 src/ai/ 目录）、`apps/desktop`（新增 app/components/chat/）
- 不触碰 harness assets（`.trae/`、`.agents/`、`AGENTS.md`）
- 无依赖变更、无 API 变更、无运行时行为变化；`pnpm verify` 三段不受影响（空目录 + README 不参与编译）
- 契约与实现随后续刀（S 刀起）进入已就位目录，本变更不预建任何代码文件
