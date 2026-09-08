# Agent Note: 会话回合管线（turn 管线）

Status: implemented

## Problem

阶段三的事件系统只有测试在生产事件——没有真实的 turn/LLM 管线，事件日志是空的。聊天链路需要：用户发消息 → 模型生成回复 → 全过程以事件落库，且"模型可见即已记录"不变量必须在真实链路成立。

## Decision

- **独立 `TurnService`**（modules/sessions/turn.service.ts）而非塞进 SessionsService：回合是"编排"（事件序 + 跨域 + LLM 调用），与会话记录 CRUD 职责不同。
- **事件序 `turn_start → user_message → assistant_message → turn_end`** 逐条独立落库（每条一个 EM fork + flush）：LLM 是外部 IO，不能放进 DB 事务；LLM 失败时已落库的 turn_start/user_message 保留（append-only 不回滚），用户重发即开启新回合。
- **模型可见即已记录**：LLM 输入是对"user_message 落库之后"的事件序列跑 `deriveMessages` 的投影——进入模型的每个字符都能从事件日志重建，顺序由 `invocationCallOrder` 测试锁定。
- **model 推导**：会话记录 agentId → `AgentsService.findById`（非抛错读取）→ `agent.model`；会话无 Agent 或 Agent 缺失时兜底 `deepseek-chat`（当前适配器即 DeepSeek 兼容）。
- v1 为非流式端点（`POST /sessions/:id/messages` 返回完整回复 + 本回合 eventIds）；SSE 流式端点留待聊天 UI 接入时按 SkipTimeout/compression 排除规则另加。
- 消息级操作不记审计（3.4 决策：审计面向管理操作，消息进事件日志）。

## Alternatives considered

- turn 四事件放进单事务：LLM 在事务内会长时间占用连接且外部 IO 不可回滚；拆分后部分失败是 append-only 语义的自然结果。
- `SessionsService` 直接查 `AgentEntity` 取 model：跨域直查表被架构约定禁止；经 `AgentsService.findById` 注入，AgentsModule 显式 exports。
- 把 turn 逻辑放进 `LLMAdapter` 调用处（controller 内联）：controller 只做协议转换的分层约定被打破，编排无法单测。

## Consequences

- 契约新增 `POST /sessions/:id/messages`（`SendMessageInput`/`TurnResult`）；事件目录的 Producers 从纯测试变为含真实生产方（turn.service.ts 的 appendEvent）。
- turn 管线使 3.3 事件总线的接入有了真实场景（turn 完成后 emit 事件给审计/推送消费者），按需在后续接入。
- fork 语义与 turn 边界在此闭环：用户可在任意 turn_end 后分叉会话。
