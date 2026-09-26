# Tasks: AI 域骨架目录落盘

> README 统一格式（一行）：`<域职责> ｜ 建立刀次：<S/H1/H2/H3/L1/L2> ｜ 详图：<docs/diagrams/ai/ 下对应文件名>`
> 全程零实现代码：只建目录与 README.md，不建任何 `.ts`/`.vue` 文件，不装依赖，不改配置。

## 1. 契约目录（packages/types）

- [x] 1.1 新建 `packages/types/src/ai/` + README.md（跨端 AI 契约：ChatStreamEvent/chat-api/session/agent/knowledge/usage schema 与 SSE 帧编解码；S 刀起步逐刀加文件） ｜ 验证：`Test-Path packages/types/src/ai/README.md` 为 True

## 2. server · AI 域模块（apps/server/src/modules/ 下平级散落）

> 2026-09-26 两次修正（用户反馈）：初版七分区复合树拆除 → `modules/ai/` 单层聚合也拆除。仓库惯例 = 一个域一个平级单层模块，AI 不设聚合容器。

- [x] 2.1 散落 S 刀三模块：`modules/chat/`（SSE 聊天面）、`modules/graph/`（编排引擎唯一收口）、`modules/model-provider/`（模型接入）+ 各 README ｜ 验证：三路径 `Test-Path <mod>/README.md` 均 True
- [x] 2.2 拆除 `modules/ai/` 聚合容器（31 目录复合树 → 单层聚合 → 最终散落） ｜ 验证：`Test-Path apps/server/src/modules/ai` 为 False

## 3. 平级预留与前端

- [x] 3.1 新建 `apps/server/src/modules/a2a/` + README（A2A 协议面：Agent Card 发布+Task 端点，tech-spec §2.1 落点[P3]） ｜ 验证：`Test-Path apps/server/src/modules/a2a/README.md` 为 True
- [x] 3.2 新建 `apps/desktop/app/components/chat/` + README（聊天工作台组件：消息流/打字机/停止按钮，S 刀起步） ｜ 验证：`Test-Path apps/desktop/app/components/chat/README.md` 为 True

## 4. 全量验证与登记

- [x] 4.1 全树核对：新目录均含 README.md 且无任何 `.ts`/`.vue` 代码文件，目录树与 design.md 代码地图一致 ｜ 验证：`Get-ChildItem apps/server/src/modules/ai -Recurse -File` 仅返回 README.md；`pnpm verify` 三段全绿
- [x] 4.2 变更归档后在骨架 note（.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md）登记"骨架目录落盘"基线（目录树 = 渐进切刀落位基线，README 为每格契约） ｜ 验证：note 追加节 + `pnpm verify:docs` OK
