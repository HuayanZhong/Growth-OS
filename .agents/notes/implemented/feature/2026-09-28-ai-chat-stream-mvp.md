# Agent Note: AI 流式聊天主流程落地（S 刀）

Status: implemented

AI 对话主链（F1）以最小实现闭环：`POST /chat/stream` SSE 端点（raw res.write + @SkipTimeout，豁免压缩）→ `modules/chat` 流编排（意图占位恒直通 + GraphEvent→ChatStreamEvent 映射，唯一事件汇聚点）→ `modules/graph` deepagents 直跑（langchain 系 import 全仓唯一收口，`verify:invariants` 目录门禁强制）→ `modules/model-provider` DeepSeek 常量注册表 + `(modelId) => BaseChatModel` 工厂（ChatDeepSeek 适配）；跨端契约 `ChatStreamEvent`（AG-UI 对齐，预留 tool*call*\_/intent\_\_ 事件名）住 `packages/types/src/ai/chat-stream.ts`；前端 `useAgentChat` 数据源替换为真实 SSE（fetch+ReadableStream，历史全量随请求，server 无状态），停止经 AbortController 透传。`adapters/llm.ts` 删除（langchain 抽象接管，无调用方），连带双语 cookbook 下线与 4 张 archify 图锚点改指 `chat-stream.ts`。完整决策与备选（前端带历史 vs MemorySaver、@Sse vs raw write、常量注册表 vs 表驱动、版本基线 2026-09-28）见 [openspec/changes/archive/2026-09-28-ai-chat-stream-mvp/proposal.md](../../../../openspec/changes/archive/2026-09-28-ai-chat-stream-mvp/proposal.md)。
