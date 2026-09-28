## Why

AI 域自 2026-09-13 teardown 后没有任何可运行的主流程：前端聊天是纯占位（零网络请求），server 侧 `chat/`、`graph/`、`model-provider/` 均为空壳目录。骨架 8 条决策与切刀框架（S 立骨 → H1-H3 加厚 → L1-L2 通电）已锁定，现在需要落 S 刀：用最小实现把"用户发消息 → AI 流式回复"这条主链跑通，并为后续每一刀留出零返工的插入点。

## What Changes

- 新增跨端契约 `ChatStreamEvent` v1（zod schema + TS 类型 + SSE 帧编解码）于 `packages/types/src/ai/chat-stream.ts`：S 期 6 个生命周期事件 + 3 组预留事件名（tool*call*\* / intent_clarification / intent_reroute，对应审查挂账 G1），前端对未知事件类型丢弃不报错（前向兼容机制）
- 新增 server `chat/` 模块：`POST /chat/stream` SSE 端点（JWT Guard + ZodValidationPipe，豁免压缩与超时），内含意图分析占位函数（恒直通）与事件映射器（langgraph 流 → ChatStreamEvent，唯一事件汇聚点，H1 落库 / L1 计量的 sink 挂点）
- 新增 server `graph/` 模块：`deepagents` v1.x（旧包名 deepagentsjs 已废弃）的 `createDeepAgent({ model, tools: [] })` 直跑，无 checkpointer、无模式注册表；langchain 系依赖全仓唯一收口于此目录
- 新增 server `model-provider/` 模块：代码内常量注册表（单行 DeepSeek：baseUrl `https://api.deepseek.com`、默认模型 `deepseek-flash`）+ `factory(modelId) => BaseChatModel` 工厂接口位（S 期实现为 DeepSeek 专用适配器 `ChatDeepSeek`；H2 换表驱动时调用方零改动）
- 修改前端 `useAgentChat`：发送占位替换为真实 SSE 消费（fetch + ReadableStream 携带 Bearer，EventSource 无法带 header），打字机增量渲染、停止按钮（AbortController → 服务端 AbortSignal 透传 LLM）
- 多轮上下文采用**前端带历史**方案：请求体携带内存会话消息数组，server 严格无状态（无会话表、无 checkpointer）
- 删除 `packages/types/src/adapters/llm.ts`：其唯一理论消费者已被 langchain 抽象接管，接口无调用方；同变更修复双语 cookbook 与 4 张 archify 图的 repository-evidence 锚点
- `verify:invariants` 新增门禁：langchain 系 import 只准出现在 `apps/server/src/modules/graph/**`
- 依赖新增（catalog 锁定，仅进 `apps/server/package.json`）：`deepagents`（v1.14.x）、`@langchain/deepseek`（v1.1.x，ChatDeepSeek）、`@langchain/langgraph`（1.x LTS）、`@langchain/core`，以及 `deepagents` 声明的 peer 依赖全集（`langchain`、`langsmith`、`@langchain/langgraph-checkpoint`、`@langchain/langgraph-sdk`——官方要求宿主显式控制版本）；`DEEPSEEK_API_KEY` 进根 `.env`（git-ignored），新增 `env.validation.ts` 条目与 `.env.example` 占位

## Capabilities

### New Capabilities

- `ai-chat-stream`: 流式聊天主流程的端到端行为契约——SSE 端点的请求/响应/错误/中断语义、ChatStreamEvent 事件集与帧格式、直通编排与模型接入的最小形态、前端 SSE 消费与停止行为

### Modified Capabilities

- `agent-chat`: 「发送追加消息与占位回复」要求反转为真实流式回复——发送后发起网络请求，agent 侧气泡接收 ChatStreamEvent 增量渲染；新增停止行为的用户可感知语义；「会话按 agent 内存缓存」保持不变（内存缓存即多轮历史来源）

## Impact

- **apps/desktop**: `app/composables/useAgentChat.ts`（数据源替换，导出接口不变）、`app/components/chat/`（打字机渲染与停止按钮）、`test/nuxt/use-agent-chat.test.ts`（占位行为断言反转为流式断言）
- **apps/server**: `src/modules/chat/`、`src/modules/graph/`、`src/modules/model-provider/`（三个空壳目录落地）、`src/app.module.ts`（挂载 chat 模块）、`src/config/env.validation.ts`（DEEPSEEK_API_KEY）
- **packages/types**: 新增 `src/ai/chat-stream.ts`（含 README 同步）、删除 `src/adapters/llm.ts` 与 barrel 导出
- **scripts**: `verify:invariants` 新增 langgraph 收口检查
- **docs**: 双语 cookbook llm-adapter（llm.ts 删除连带）、`docs/diagrams/ai/` 4 张图的 types 锚点、根 `.env.example`、tech-spec §1.2 表中过时的包名/签名条目（deepagentsjs → `deepagents`、ChatOpenAI 工厂 → ChatDeepSeek，骨架笔记已标注 tech-spec 重写待做）
- **harness 资产**: 按 repo 契约随变更交付 thin-pointer Agent Note（`.agents/notes/`）；不修改 `.trae/rules` 与 `AGENTS.md`
- **已知限制（S 期明面接受）**: 消息不落库（刷新即失，与现状一致）、无工具调用、无意图路由（全部直通）、单供应商、usage 不计
