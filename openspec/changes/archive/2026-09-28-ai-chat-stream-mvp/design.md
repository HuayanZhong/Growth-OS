## Context

AI 域骨架 8 条决策与切刀框架已锁定（[2026-09-25-ai-architecture-skeleton-and-diagram-suite.md](../../../../.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md)）：Nuxt HTTP/SSE 直连 NestJS、AI 代码住 `modules/` 契约住 `@growth-os/types`、单引擎三层栈收敛 `modules/graph/`、OpenAI 兼容注册表、SSE 豁免压缩与超时。旧 turn 管线的核心教训——LLM 是外部 IO 不能进事务、"模型可见即已记录"（[2026-09-07-turn-pipeline.md](../../../../.agents/notes/implemented/feature/2026-09-07-turn-pipeline.md)）——约束事件管道的形态。前端 `useAgentChat` 现为纯内存占位，注释已预留"接口不变替换数据源"。`adapters/llm.ts` 为 teardown 时显式保留、去留归本刀的设计决策（同上骨架笔记"旧产物清理落地"节）。

## Goals / Non-Goals

**Goals:**

- 一条真实流式闭环：发送 → 编排 → DeepSeek → SSE 增量 → 打字机渲染 → 可停止
- 每个未来刀次（H1 落库 / H2 表驱动 / H3 意图 / 工具 / HITL）有明确、零返工的插入点
- ChatStreamEvent 契约一次定稿 v1：S 期发出的事件 + G1 要求的预留事件名

**Non-Goals:**

- 意图路由、工具调用、RAG、checkpointer、会话持久化、usage 计量（G2/G5 挂账 H1/H2）
- 多供应商切换与重试矩阵（G5 挂账 H2）
- 前端 UI 形态改动（沿用现有 chat 组件与停靠过渡行为）

## Decisions

**D1 多轮上下文放前端（而非 server MemorySaver）。** 请求体携带消息历史，server 严格无状态。理由：最小化的彻底形态——无 checkpointer、无会话表、重启无感，且模型可见的输入即请求体明文。备选 MemorySaver：白背进程内状态（比前端内存更脆），S 期用不上 interrupt/resume，H1 还要再切 PostgresSaver。H1 落库时历史来源从请求体换成服务端读取，`SendMessageInput` 契约不变。

**D2 意图分析 = 纯函数占位。** `chat/` 模块内 `analyzeIntent()` 恒返回直通（视为 chat），H3 换实现时调用方零改动。不做桩事件、不做配置开关——恒直通即最薄占位。

**D3 事件映射器 = 唯一事件汇聚点。** SSE 编排组织为 async generator 管道：graph 产出事件流 → chat 模块映射为 ChatStreamEvent → SSE 写出。H1 落库 / L1 计量 / 经验池入库均为管道上的 tap（wrap 生成器），不改编排逻辑——这是旧 turn 管线"LLM 外部 IO 不进事务"教训在流式架构下的对应物。

**D4 langchain 类型不越过 graph/ 边界。** `graph/` 对外暴露自有的极简 `AsyncIterable<GraphEvent>` 接口，langgraph/deepagentsjs import 全部留在 `graph/` 内；`chat/` 只做 `GraphEvent → ChatStreamEvent` 的契约映射。`verify:invariants` 新增目录门禁：编排引擎（`deepagents`、`@langchain/langgraph*`、`langchain`、`langsmith`）import 仅允许出现在 `apps/server/src/modules/graph/**`；模型适配与抽象（`@langchain/core`、`@langchain/deepseek` 等供应商适配器）额外允许 `modules/model-provider/**`（工厂在该域实例化适配器，符合模块 README 既有职责划分）；测试镜像目录同白名单。

**D5 帧格式 = data-only 单事件帧。** `data: {"type":"..."}\n\n`，不用 SSE `event:`/`id:` 字段、不批量。理由：判别联合靠 JSON `type` 字段走 zod 解析，SSE 原生保序无需 seq；批量与 `event:` 字段是给无 JSON 判别的场景用的。前端对未知 `type` 丢弃并 console.warn——这是契约加法演进的兼容机制。

**D6 SSE 端点用 NestJS `@Sse` + Observable。** 既有中间件豁免规则（压缩 via includes、`@SkipTimeout`、ResponseEnvelopeInterceptor 排除 SSE）成套适配 `@Sse`。备选 raw `res.write`：控制力更强但绕开框架语义。实现首日以 spike 验证 `@Sse` 下的 AbortSignal 透传；若中断语义不成立则该控制器降级 raw 实现（控制器内聚变更，不影响契约与其余设计）。

**D7 model-provider = 常量注册表 + 工厂接口位。** `registry.ts` 导出常量单行（DeepSeek：baseUrl `https://api.deepseek.com`、模型列表、默认 `deepseek-flash`、apiKeyEnv 名），`factory.ts` 导出 `(modelId) => BaseChatModel`。S 期实现为 `new ChatDeepSeek({ model, apiKey })`——用 DeepSeek 官方 LangChain 适配器（`@langchain/deepseek`），不引入 `@langchain/openai` 通用包。与骨架决策 6（OpenAI 兼容协议 + 注册表）不冲突：DeepSeek API 本身即 OpenAI 兼容协议，S 期选专用适配器只是省掉手工拼 baseUrl/模型的配置层；H2 引入其他供应商时逐家选官方适配器（各家均有 `@langchain/*` 包），统一接口位就是 `BaseChatModel`。不内联 `new ChatDeepSeek` 进 graph——工厂签名即 H2 表驱动的接口位，届时只换实现不换调用方。

**D8 删除 `adapters/llm.ts`。** langchain 抽象已接管模型调用，`LLMAdapter` 无调用方，保留即死代码（knip 报告 + 双抽象负债）。备选"改造为注册表接口"被否：types 是双端叶子包，langchain 适配是 server 内部事务，跨端契约里没有它的位置。同变更修复双语 cookbook 与 4 张 archify 图 repository-evidence 锚点，`pnpm verify:docs` 全绿。

**D9 前端消费用 fetch + ReadableStream。** EventSource 无法携带 Authorization header（浏览器硬约束），无选择空间。解析器为纯函数（帧分割 + JSON 解析 + zod 校验），node 环境可单测。

**D10 版本与包名基线（2026-09-28 核实，catalog 锁精确版本）。** `deepagents` v1.14.x——旧包名 `deepagentsjs` 已在 npm 废弃，**不得使用**；`createDeepAgent` 为参数对象式 `createDeepAgent({ model, tools, systemPrompt })`，返回 compiled LangGraph graph（可直接 `.streamEvents`/`.stream`），与 tech-spec §1.2 记载的旧签名不同（tech-spec 随本刀修正）；`@langchain/deepseek` v1.1.x（`ChatDeepSeek`，支持流式与工具调用）；`@langchain/langgraph` 1.x（官方 LTS）；DeepSeek 当前模型名为 `deepseek-flash` / `deepseek-v4-pro`（旧 `deepseek-chat` 已退役），注册表默认取 `deepseek-flash`。`deepagents` 将 `@langchain/core`、`langchain`、`langsmith`、`@langchain/langgraph-checkpoint`、`@langchain/langgraph-sdk` 声明为 peer 依赖且官方要求宿主显式控制版本——全部进 `apps/server/package.json` + catalog。

## Code Organization

模块依赖方向单向：`chat → graph → model-provider`，三者都消费 `@growth-os/types`，`model-provider` 不被反向依赖。文件全部平铺（与 auth/audit 同构）：

```
apps/server/src/modules/
  model-provider/                # 模型接入（纯 provider，无 controller）
    model-provider.module.ts     #   提供 MODEL_FACTORY provider 并 exports
    registry.ts                  #   DeepSeek 常量行（baseUrl/models/default/apiKeyEnv）
    factory.ts                   #   (modelId) => BaseChatModel（ChatDeepSeek 实例）
  graph/                         # 编排引擎（langchain 系 import 唯一收口，门禁强制）
    graph.module.ts
    graph-event.ts               #   GraphEvent 极简判别类型（graph 自有，不漏 langchain 类型）
    chat-agent.ts                #   createDeepAgent({ model, tools: [] }) 装配
    run-chat-turn.ts             #   runChatTurn(input, signal): AsyncIterable<GraphEvent>
  chat/                          # SSE 面
    chat.module.ts
    chat.controller.ts           #   POST /chat/stream（@Sse，协议转换 only）
    chat-stream.service.ts       #   编排组装：analyzeIntent → runChatTurn → mapper
    intent.ts                    #   analyzeIntent() 占位恒直通（H3 换实现）
    event-mapper.ts              #   GraphEvent → ChatStreamEvent（契约映射）

packages/types/src/ai/
  chat-stream.ts                 # ChatStreamEvent zod 判别联合 + TS 类型 + SSE 帧编解码
  README.md                      # 一行职责（已有，随实现核对）

apps/desktop/app/
  utils/sse.ts                   # 纯函数：字节流 → SSE 帧 → ChatStreamEvent（zod 校验、
                                 #   未知 type 丢弃 warn）；node env 可单测
  composables/useAgentChat.ts    # 数据源替换（导出接口不变）；fetch + ReadableStream +
                                 #   AbortController + 会话历史组装住这里
  components/chat/               # 视图装配：消息流 / 打字机 / 停止按钮（SFC 零业务逻辑）
```

分层纪律：`chat.controller.ts` 只做协议转换（SSE 帧写出 + 信封错误），编排逻辑住 service；`graph/` 对外只暴露 `run-chat-turn.ts` 与 `graph-event.ts`，langgraph/deepagents/deepseek 类型不出本目录；前端 SFC 不写状态机（desktop SFC layering 规则）。

## Risks / Trade-offs

- [deepagentsjs 小版本 API 漂移（骨架笔记评级高概率）] → catalog 锁精确版本 + `graph/` 唯一收口 + 升级跑全量单测
- [`@Sse` 中断/背压语义未验证] → 实现首日 spike（D6），失败降级 raw res.write，范围限于单个控制器
- [前端全量历史随会话增长，token 上限无管理] → S 期接受（DeepSeek 128k）；H1 服务端历史管理接管时请求体历史字段降级为可选
- [llm.ts 删除牵连文档与图锚点] → 同变更原子修复，`pnpm verify` 门禁兜底，不产生中间态
- [SSE 无法走既有 supertest 式断言] → 服务端测试 mock 模型流（遵循 tests mock 规则，不真调外部服务），帧编解码纯函数单独覆盖
- [S 期消息不落库，旧 turn 管线的可追溯性暂缺] → 明面接受（proposal 已声明）；H1 立项时以 D3 的管道 tap 补齐

## Migration Plan

纯增量上线：新端点、新模块、前端数据源替换。无数据迁移；回滚 = revert 提交（llm.ts 删除与锚点修复在同一变更内原子进行，revert 不产生半修复状态）。

## Open Questions

无阻塞项。`@Sse` 中断语义（D6）为实现期首日 spike，其结果不改变契约与任务分解。
