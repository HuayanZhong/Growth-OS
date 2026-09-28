## 1. 契约与依赖（契约先行）

- [x] 1.1 新建 `packages/types/src/ai/chat-stream.ts`：ChatStreamEvent 判别联合 zod schema（`run_started` / `text_message_start` / `text_message_content` / `text_message_end` / `run_finished` / `error` + 预留事件名常量）+ `z.infer` 类型 + SSE 帧编解码纯函数（`data: <json>\n\n` 单事件帧，encode/decode），barrel 导出，`packages/types/src/ai/README.md` 同步；验证：`pnpm typecheck` 与 `pnpm lint` 全绿
- [x] 1.2 依赖落位：`deepagents`、`@langchain/deepseek`、`@langchain/langgraph`、`@langchain/core` 及 deepagents 的 peer 依赖全集（`langchain`、`langsmith`、`@langchain/langgraph-checkpoint`、`@langchain/langgraph-sdk`）以 catalog: 协议进 `pnpm-workspace.yaml` catalogs 并仅加入 `apps/server/package.json`（精确版本，禁止旧包名 deepagentsjs）；`DEEPSEEK_API_KEY` 加入 `apps/server/src/config/env.validation.ts` 与根 `.env.example`（真实值只进 git-ignored 的根 `.env`）；验证：`pnpm install` 成功且 `pnpm --filter server typecheck` 全绿

## 2. model-provider 模块（S 期最小形态）

- [x] 2.1 `apps/server/src/modules/model-provider/`：`registry.ts` 导出常量单行 DeepSeek（baseUrl `https://api.deepseek.com`、模型列表、默认 `deepseek-flash`、apiKeyEnv 名），`factory.ts` 导出 `(modelId) => BaseChatModel` 工厂（S 期实现为 `ChatDeepSeek`，apiKey 从服务端环境变量读取，缺 key 抛出可读错误）；验证：`pnpm --filter server test`（factory 单测 mock ChatDeepSeek，覆盖正常与缺 key 分支）

## 3. graph 模块（编排唯一收口）

- [x] 3.1 `apps/server/src/modules/graph/`：`graph-event.ts`（自有极简类型）+ `chat-agent.ts`（`createDeepAgent({ model, tools: [] })` 参数对象式装配，model 来自 model-provider 工厂）+ `run-chat-turn.ts`（`runChatTurn(input, signal): AsyncIterable<GraphEvent>`，langgraph/deepagents/deepseek 类型不出本目录）；验证：`pnpm --filter server test`（mock 模型流覆盖文本增量与完成事件序）
- [x] 3.2 `verify:invariants` 新增检查：编排引擎（deepagents/langgraph/langchain/langsmith）import 仅允许在 `apps/server/src/modules/graph/**`，模型适配（@langchain/core、@langchain/deepseek）额外允许 `modules/model-provider/**`；验证：`pnpm verify:invariants` 全绿且红测（graph 外临时 import 一次确认会红后移除）已通过

## 4. chat 模块（SSE 端点与流编排）

- [x] 4.1 `apps/server/src/modules/chat/intent.ts`：`analyzeIntent()` 纯函数占位（恒返回直通 chat），附 H3 替换说明注释；验证：`pnpm --filter server test`（占位单测锁定恒直通行为）
- [x] 4.2 `apps/server/src/modules/chat/`：`POST /chat/stream` SSE 端点（`@Sse` + Observable，`ZodValidationPipe` 挂 `createChatStreamSchema`，`@SkipTimeout`，事件映射器 GraphEvent→ChatStreamEvent，AbortSignal 透传），先做 `@Sse` 中断/背压 spike（失败则该控制器降级 raw res.write，其余设计不变），`app.module.ts` 挂载 ChatModule；验证：`pnpm --filter server typecheck` 全绿且手动 curl 可见帧序列
- [x] 4.3 服务端测试：合法请求建立流、缺 JWT 返 401 envelope、请求体非法返 400 envelope、正常回复帧序（run_started→…→run_finished）、模型失败下发 error 事件后关流、客户端 abort 服务端终止（全程 mock 模型流，不真调外部服务）；验证：`pnpm --filter server test` 全绿

## 5. 前端（useAgentChat 数据源替换）

- [ ] 5.1 新建 SSE 帧解析纯函数（字节流分割 + zod 校验 + 未知 type 丢弃 warn，node 环境可测）与 fetch + ReadableStream 消费逻辑（携带 Bearer 与消息历史，AbortController 中止）；验证：`pnpm --filter desktop test`（解析纯函数 node env 单测：多帧、跨块边界、未知事件、坏帧跳过）
- [ ] 5.2 `useAgentChat.ts` 数据源替换：sendMessage 内部改为发起流式请求，等待指示→增量打字机渲染、停止按钮中止、error 事件/建流失败错误呈现、401 沿用本地登出降级、每次请求携带内存会话历史；导出接口不变（`stagePending`/`consumePending` 交接不变）；验证：`pnpm --filter desktop test`（更新 use-agent-chat.test.ts：fetch stub 流式 mock，覆盖流式渲染、停止保留部分文本、错误呈现、重启清空不变）
- [ ] 5.3 `apps/desktop/app/components/chat/` 接入停止按钮与增量渲染（SFC 只做视图装配与事件接线，逻辑住 composable）；验证：`pnpm --filter desktop test` 全绿，`pnpm dev` 手动验证发送→流式回复→停止→继续追问完整流程

## 6. 文档、清理与收尾

- [x] 6.1 删除 `packages/types/src/adapters/llm.ts` 与 barrel 导出，同变更修复双语 cookbook（llm-adapter.md/.zh.md）与 `docs/diagrams/ai/` 4 张 archify 图的 repository-evidence 锚点；验证：`pnpm verify:docs` 全绿且 `pnpm --filter server typecheck` 无残留引用
- [x] 6.2 交付 thin-pointer Agent Note（`.agents/notes/`，链接本 change），核对三个模块目录 README 一行职责与本刀落地一致（model-provider README 的「ChatOpenAI 适配器工厂」措辞改为 ChatDeepSeek 工厂），修正 tech-spec §1.2 过时条目（deepagentsjs → `deepagents` 包名与 `createDeepAgent({ model, tools })` 参数对象式签名、ChatOpenAI → ChatDeepSeek）；验证：`pnpm verify:docs` 全绿
- [x] 6.3 全仓验证收口：`pnpm test` → `pnpm typecheck` → `pnpm lint` → `pnpm verify` 依次全绿
