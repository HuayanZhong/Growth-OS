# AI 模块建设方案（对标 Coze · Deep Agent 编排）

> 状态：方案设计（未实现）
> 相关文件：`apps/server/src/modules/`（待建）/ `packages/types/src/utils/ipc-channels.ts` / `apps/desktop/app/pages/dashboard/agents/index.vue` / [apps/server/AGENTS.md](../../apps/server/AGENTS.md)
> 现状：服务端无任何业务模块（`modules/` 为空）；agents 页仅有聊天视口 UI 骨架，发送消息无真实 AI 回复；Supabase JWT 未在 NestJS 侧校验

---

## 一、目标与范围

一期交付四项能力，全部运行于服务端编排：

1. **流式聊天对话**——SSE 打字机输出，含中断
2. **会话与消息持久化**——conversation/message 表 + MikroORM 迁移 + 历史加载
3. **智能体配置**——agent 表：人设 prompt、模型参数、开场白，支撑 agents 页多智能体
4. **知识库 RAG**——文档上传 → 切片 → embedding → pgvector 检索增强

## 二、决策记录（已确认）

| # | 决策 | 结论 | 核心理由 |
|---|------|------|----------|
| D1 | 调用位置 | **NestJS 后端代理** | API Key 只存服务端；RAG 与数据库同侧；可按用户管控计费限流。Electron 直连仅适合 BYOK 单机工具 |
| D2 | 代码位置 | **运行时进 `apps/server/src/modules/*`；跨端契约进 `@growth-os/types`** | 包边界由消费者数量决定：AI 编排唯一消费者是 server（实证：Coze Studio 编排在 backend 域内、LibreChat 在 api 内；FastGPT 的 service 包因商业版第二个消费者才存在）。触发抽包条件：出现第二个 AI 运行时消费者（独立 worker / CLI）时平移为 `@growth-os/ai-core` |
| D3 | 目录归属 | 业务域进 `modules/`，非 `common/infra` | infra = 零业务词汇的技术底座；common = 全模块共享的横切设施；AI 充满业务概念（人设/知识库检索），且 server AGENTS.md 已写明 modules 即业务模块层 |
| D4 | 编排框架 | **deepagents**（LangChain TS 生态） | 对标 DeepAgent；内置 planning / filesystem / subagent delegation；checkpointer 支持 Postgres 持久化 |
| D5 | 模型接入 | **OpenAI 兼容协议 + Provider 注册表**，由 agent 配置驱动 | DeepSeek/智谱/通义/Kimi/OpenAI 同一套 `ChatOpenAI` 换 baseURL；换供应商 = 改数据不改代码 |
| D6 | 鉴权 | **Supabase JWT Guard**（JWKS 验签） | 防 Key 被白嫖；为后续 RLS 打基础 |
| D7 | 持久化 | **双轨**：`message` 表（对外聊天记录）+ Postgres checkpointer（LangGraph 引擎内部状态） | 职责分离，互不污染 |

## 三、架构总览

```
apps/desktop (Nuxt 渲染进程)
  use-agent-chat.ts ── fetch POST(SSE) ──► apps/server (NestJS)
       ▲                                    │ auth/             Supabase JWT Guard (JWKS)
       │ @growth-os/types                   │ ├─ agent/         智能体 CRUD ──────► agent
       │ (ai/chat-events.ts, ai/dto.ts)     │ ├─ conversation/  会话/消息 ────────► conversation, message
       └────────────────────────────────────┤ ├─ knowledge/     上传→切片→embedding ► knowledge_document, document_chunk (pgvector)
                                            │ ├─ model-provider/ 注册表 + 工厂
                                            │ └─ ai/             controller(SSE) + service
                                            │      └─ graph/ createDeepAgent(model, tools=[retrieve_knowledge])
                                            │           ▼ deepagents/LangGraph ──► 模型 API
                                            └─ infra/database/  迁移（seeder 含「小芽」）
```

要点：

- **渲染进程直连后端，不走 Electron IPC**——主进程继续只管 secureStore 和更新，Web 版未来零成本复用同一条链路
- 重依赖（`@langchain/*`、`deepagents`）只出现在 server 的 package.json，前端 bundle 永不接触
- 服务端生产形态按云端部署设计接口，开发期本机运行，不阻塞

## 四、服务端模块设计

```
apps/server/src/modules/
├── auth/                      # JWT Guard + @CurrentUser 装饰器（装饰器本体在 common/decorators）
├── agent/                     # 智能体配置 CRUD（entities/agent.entity.ts）
├── conversation/              # 会话/消息 CRUD（entities/conversation.entity.ts, message.entity.ts）
├── knowledge/                 # RAG 全链路
│   ├── document.service.ts    #   上传/解析/切片
│   ├── embedding.service.ts   #   向量化
│   ├── retrieval.service.ts   #   检索（pgvector 原生 SQL）
│   └── entities/
├── model-provider/            # 供应商抽象
│   ├── provider.registry.ts   #   DeepSeek/智谱/通义/Kimi/OpenAI 注册表（baseUrl + apiKeyEnv）
│   └── model.factory.ts       #   按 agent 配置创建 BaseChatModel
└── ai/                        # 编排核心
    ├── ai.controller.ts       #   POST /ai/chat（SSE）、连接断开即中断
    ├── ai.service.ts          #   组装 Deep Agent 并流式调度
    ├── graph/                 #   createDeepAgent 构建/缓存/checkpointer 接线
    ├── stream/                #   LangGraph 事件 → SSE 事件映射
    └── tools/                 #   retrieve_knowledge 等业务工具
```

## 五、数据模型（首批实体，全部带 user_id 隔离）

| 表 | 关键字段 | 备注 |
|----|----------|------|
| `agent` | name, persona, greeting, suggestions(jsonb), model_config(jsonb: provider/model/temperature/maxTokens), enabled | 「小芽」作为 seeder 种子 |
| `conversation` | agent_id(fk), title(默认"新对话"), last_message_at | 列表按 last_message_at 排序 |
| `message` | conversation_id(fk), role(user/assistant), content, interrupted, tool_calls(jsonb), prompt_tokens, completion_tokens | 只增不改 |
| `knowledge_document` | title, source_type, status(pending/embedding/ready/failed), chunk_count | 上传流水 |
| `document_chunk` | document_id(fk), content, chunk_index, embedding vector(N) | N 入配置；HNSW 索引；pgvector 扩展与向量列用原生 SQL 迁移创建 |

迁移走既有 `mikro-orm:migration:create` 流程（见 [docs/server/database.md](../../docs/server/database.md)）；LangGraph checkpointer 复用同一 `DATABASE_URL`，自管表结构。

## 六、API 契约

REST（全部要求 Bearer token）：

```
POST   /ai/chat                { agentId, conversationId?, content } → SSE 流
GET    /conversations?agentId= / POST / PATCH / DELETE /conversations/:id
GET    /conversations/:id/messages
CRUD   /agents
POST   /knowledge/documents    GET /knowledge/search（调试用）
```

SSE 事件定义于 `packages/types/src/ai/chat-events.ts`（前后端编译期同步）：

```ts
type ChatStreamEvent =
  | { type: 'start'; messageId: string; conversationId: string }
  | { type: 'delta'; content: string }                    // 打字机增量
  | { type: 'tool_start' | 'tool_end'; name: string }     // 工具调用可见化
  | { type: 'done'; finishReason: 'stop' | 'interrupted' | 'error'; usage?: TokenUsage }
  | { type: 'error'; code: string; message: string }
```

中断机制：前端 `AbortController` 断开连接 → 服务端监听 `req.close` 透传 AbortSignal 给 LangGraph → 已生成部分落库并标记 `interrupted`。

## 七、前端改造点

| 文件 | 改动 |
|------|------|
| `app/composables/use-agent-chat.ts`（新增） | SSE 解析循环、乐观追加消息、abort、错误 toast |
| `app/composables/use-api.ts`(新增) | 统一 fetch 封装：`getSession()` 取 access_token 拼 Bearer 头 |
| `app/components/chat/types.ts` | 扩展 streaming/interrupted/toolName 字段；事件类型从 types 包导入 |
| `app/pages/dashboard/agents/index.vue` | 接真数据：greeting/suggestions 来自 agent 配置 |

⚠️ 规范冲突处理：[token 规则](../rules/frontend/auth/token.md) 规定「不得手拼 Authorization 头」——该规则针对 Supabase API（supabase-js 自动注入）；调用自有 NestJS 必须手动携带。处理方式：单点封装在 `use-api.ts`，实施时在规则中补充例外说明并附 Agent Note。

## 八、依赖与环境变量

catalog 新增（backend 组，版本实施时核对后锁定）：`deepagents`、`@langchain/core`、`@langchain/openai`、`@langchain/langgraph`、`@langchain/langgraph-checkpoint-postgres`、`jose`。前端零新增依赖。

根 `.env` 新增（同步 `.env.example`）：`DEEPSEEK_API_KEY`、`ZHIPU_API_KEY`（可选）、`OPENAI_API_KEY`（可选）、`AI_EMBEDDING_MODEL`、`AI_EMBEDDING_DIM=1536`。

## 九、迭代里程碑（每步独立验收，全绿再进下一步）

- [ ] **M1 鉴权骨架**：auth Guard + `@CurrentUser` + use-api 封装 + 受保护探针端点。验收：无 token 401 / 有 token 200，测试覆盖两分支
- [ ] **M2 流式最小闭环**：model-provider + ai 模块（无记忆流式聊天）。验收：agents 页打字机真回复；中途 abort 生效
- [ ] **M3 会话持久化**：conversation/message 实体+迁移+REST，聊天落库。验收：重启后历史完整加载，会话列表增删改查
- [ ] **M4 智能体配置**：agent 实体+CRUD+种子「小芽」。验收：切换智能体 → 人设/开场白/模型生效
- [ ] **M5 知识库 RAG**：knowledge 全链路 + retrieve_knowledge 工具挂载。验收：上传文档后提问命中内容回答

每期配套：单测（mock 网络/LLM，绝不真调外部服务）、`pnpm --filter server typecheck` → 仓库三件套（test/typecheck/lint）、非平凡改动附 Agent Note、涉及架构图时更新 [docs/architecture.md](../../docs/architecture.md)。

## 十、风险与对策

1. **deepagents TS 版本迭代快** → 版本锁死 catalog；用法收敛在 `ai/graph/` 一个目录，升级爆炸半径最小
2. **Supabase JWT 算法差异**（新项目 ES256/JWKS，旧项目 HS256 secret）→ Guard 启动探测 JWKS，保留 `SUPABASE_JWT_SECRET` 回退
3. **Embedding 维度绑定模型** → 维度入配置；换 embedding 模型需重跑向量化（写入 knowledge 模块迁移策略）
4. **Session pooler 连接数限制** → checkpointer 复用同一 DATABASE_URL，短事务操作
5. **手动 Authorization 头与 token 规则冲突** → 见第七节，单点封装 + 规则补例外

## 十一、验证策略

- 服务端：model.factory / provider.registry / prompt 渲染单测；controller 测试 mock 掉 deepagents（CI 不调真实 LLM）
- 桌面端：use-agent-chat 单测 mock fetch 流（成功/错误/中断三路径），遵守 `.trae/rules/frontend/tests/`
- 全局：`pnpm test` → `pnpm typecheck` → `pnpm lint`

## 涉及文件清单

**新增（服务端）**：
- `apps/server/src/modules/auth/**`、`modules/model-provider/**`、`modules/ai/**`、`modules/conversation/**`、`modules/agent/**`、`modules/knowledge/**`
- `packages/types/src/ai/chat-events.ts`、`packages/types/src/ai/dto.ts`

**新增（桌面端）**：
- `apps/desktop/app/composables/use-agent-chat.ts`、`apps/desktop/app/composables/use-api.ts`

**修改**：
- `pnpm-workspace.yaml`（backend catalog 新增依赖）
- 根 `.env.example` 与本地 `.env`（AI Key 与 embedding 配置）
- `packages/types/src/index.ts`（barrel 导出 ai 契约）
- `.trae/rules/frontend/auth/token.md`（补自有后端 Bearer 头例外说明）
