# Growth OS · AI 技术规格书

> 状态：规格设计（未实现）｜ 骨架基线：`.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md`（8 条锁定决策）
> 姊妹方案：RAG 与多 Agent 融合架构见 [ai-rag-multiagent-design.md](ai-rag-multiagent-design.md)（意图分层 / GraphRAG 选型 / ReACT·Plan·多 Agent 路由）
> 审查：架构全面审查（闭环 / 正确性 / 成熟度差距 G1-G14）见 [ai-architecture-review.md](ai-architecture-review.md)
> 视觉基线：[docs/diagrams/ai/](../../docs/diagrams/ai/)（架构总览 / 对话时序 / 编排工作流 / 数据流转 四图）
> 本文档承接骨架，输出三层内容：技术栈规格（§1）、前沿技术集成评估（§2）、技能提升框架（§3），附时间线与资源（§4）。

---

## 0. 阅读约定

- **[F]** = 已验证事实（2026-09 检索确认，附来源）；**[J]** = 判断（基于事实的工程推论）；未标注 = 项目内既定事实。
- 所有"版本"在实施时以 npm 实测锁定进 `pnpm-workspace.yaml` catalog，本文只给出已知主版本与锁定策略。
- 本规格不替代 OpenSpec 流程：每个落地项仍需 `/opsx-propose` 立项（契约先行：types → server → 前端 → 测试）。

---

## 1. 技术栈规格

### 1.1 总原则

1. **单一包管理器**：pnpm 12.1.0（workspace catalog，`catalog:` 协议引用，禁止裸版本）。
2. **服务端 ESM 纪律**：NestJS 以 `"type": "module"` + NodeNext 运行，相对导入带显式扩展名，禁 CJS API（`require`/`__dirname`）。
3. **依赖边界**：AI 重依赖只进 `apps/server/package.json`；前端 bundle 零 AI 依赖；跨端契约只进 `@growth-os/types`（strip-only 语法，`verify:invariants` 强制）。
4. **版本锁定策略**：LangChain 系迭代快 [F]，全部锁 catalog 精确版本；用法收敛在 `modules/ai/graph/` 单一目录，升级爆炸半径最小。

### 1.2 分层组件规格

| 层 | 组件 | 规格 | 说明 |
|---|---|---|---|
| 桌面壳 | Electron | `packages/desktop-core`，主进程只管 secureStore/更新/OAuth 子窗 | AI 数据不走 IPC（骨架决策 1） |
| 渲染进程 | Nuxt 4 + Vue 3 | `apps/desktop`，`useApi`/`apiFetch` 拼 Bearer，SSE 消费在 `use-agent-chat` | 零 AI 依赖 |
| 契约 | `@growth-os/types` | zod schema + TS 类型；`ChatStreamEvent` 命名对齐 AG-UI 生命周期语义 | 单一真相源（骨架决策 2） |
| 服务端 | NestJS | ESM/NodeNext；zod `ZodValidationPipe`；`{data}` 信封；SSE 端点豁免压缩与超时 | 基建已落地 |
| Harness | **deepagentsjs** | `createDeepAgent(model, tools, …)`；规划/文件/子代理/skills 内置；Node 22+（仓库 Node ≥24 满足）[F] | 官方 quickstart：docs.langchain.com/oss/javascript/deepagents/quickstart |
| Runtime | `@langchain/langgraph` | durable 执行、`interrupt()`/`Command(resume)`、checkpointer 接线 | v1.x 系（v1.2 起 DeltaChannel 增量 checkpoint [F]） |
| Framework | `@langchain/core` + `@langchain/openai` | `ChatOpenAI` 模型抽象、内置工具、`langchain.mcp` 命名空间（v1.4+，beta）[F] | MCP 适配器替代旧 langchain-mcp-adapters |
| 持久化（引擎态） | `@langchain/langgraph-checkpoint-postgres` | 复用同一 `DATABASE_URL`，自管表结构，短事务 | 与业务表同库不同表（骨架决策 4） |
| 持久化（业务） | MikroORM v7 + Supabase Postgres | `defineEntity`、contextName 'default'、迁移走 mikro-orm 脚本 | 全表带 `user_id`，RLS 随迁移 |
| 向量 | pgvector | 原生 SQL 迁移启用扩展；`document_chunk.embedding vector(N)`，HNSW；N 入配置 | 知识期启用 |
| 模型接入 | OpenAI 兼容注册表 | DeepSeek/智谱/通义/Kimi/OpenAI = 数据行（baseUrl + apiKeyEnv + model 列表），`model.factory` 实例化 | 换供应商改数据不改代码（骨架决策 6） |
| 鉴权 | Supabase JWT + jose | JWKS 双轨验证（ES256 探测 + HS256 回退），全局 Guard + `@Public()` | 已落地（M1） |
| 观测 | LangSmith | `LANGSMITH_API_KEY` / `LANGSMITH_TRACING=true` / `LANGSMITH_PROJECT`（新变量名，旧名失效）[F] | tracing + evals + Tuned Evaluators 可选启用 |
| 协议挂点 | AG-UI / MCP / A2A | 只留门：事件契约已对齐 AG-UI；MCP 走 `langchain.mcp`；A2A 见 §2.1 | 骨架决策 7 |
| 质量 | Vitest + turbo | test → typecheck → lint 三件套全绿门禁；CI 不真调外部服务 | 既有纪律 |

### 1.3 环境变量与密钥

| 变量 | 位置 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 根 `.env`（git-ignored） | 首选供应商（成本最低档） |
| `ZHIPU_API_KEY` / `DASHSCOPE_API_KEY` / `MOONSHOT_API_KEY` / `OPENAI_API_KEY` | 根 `.env` | 可选，注册表数据行引用 |
| `AI_EMBEDDING_MODEL` / `AI_EMBEDDING_DIM` | 根 `.env` | 维度绑定模型，换模型须重跑向量化 |
| `LANGSMITH_API_KEY` / `LANGSMITH_TRACING` / `LANGSMITH_PROJECT` | 根 `.env` | 观测开关，默认关 |
| `DATABASE_URL` | 根 `.env` | 既有，session pooler |

Key 只在服务端进程环境读取，禁止进 `launchEnv`/客户端（骨架决策 8，云端约束）。

### 1.4 依赖风险表

| 风险 | 概率 | 对策 |
|---|---|---|
| deepagentsjs 小版本 API 漂移 | 高 [F] | catalog 锁死；`graph/` 目录唯一收口；升级跑全量单测 |
| `langchain.mcp` beta 破坏性变更 | 中 [F] | 首期不依赖 beta 面，仅留接口位 |
| checkpointer 与 session pooler 连接数竞争 | 中 | 短事务、按需建池、Supabase 配额监控 |
| LangSmith 数据出境 | 中 | 默认关闭；生产可换自托管 OTel 方案 [J] |

---

## 2. 前沿技术集成评估

评估对象：**A2A、OKF、RSI**（AG-UI 已作为命名基线落地，不重复评估）。每项四节：技术评估 → 集成策略 → PoC → 技能路线图。执行架构模式（ReAct / Plan-and-Execute / Supervisor 等 14 种）的统一选型与 deepagentsjs 注入方案见 [ai-agent-patterns-selection.md](ai-agent-patterns-selection.md)。

### 2.1 A2A（Agent2Agent Protocol）

**a. 技术评估** [F]

- 协议：Linux Foundation 托管，v1.0（2026-03 稳定版），150+ 组织支持（AWS/Azure/Google 三云原生集成）；IBM ACP 已并入，行业收敛于此。
- 机制：JSON-RPC 2.0 over HTTPS，长任务 SSE 流式回传；三原语 = **Agent Card**（`/.well-known/agent.json`）+ **Task**（`submitted→working→input-required→completed/failed/canceled` 状态机）+ **Artifact**（交付物）。v1.0 含签名 Agent Card（密码学身份）与多租户。
- 生态位：与 MCP 互补——"MCP 给 agent 手（连工具），A2A 给 agent 同事（连彼此）"。**LangGraph 官方内置 A2A 集成**（docs.langchain.com/langsmith/server-a2a），与我们的 runtime 直接对口。
- 兼容性：与 NestJS HTTP 层同构（一个 controller + SSE），无新运行时 [J]。
- 性能：每 agent 一个 HTTP 端点；Task 状态机为无状态服务端实现，横向扩展由现有限流/池化承担 [J]。
- 学习曲线：**低-中**。协议表面积小（三原语），主要成本在状态机与鉴权映射。

**b. 集成策略**（骨架挂点 3"子代理外置"的落地形态）

- 落点：`modules/a2a/`——两个 controller：`/.well-known/agent.json`（Agent Card 发布）+ `/a2a/tasks`（Task 提交与 SSE）；service 层把 Task 适配到 `ai/graph/` 的 CompiledGraph 调用。
- 方向：先做 **server**（对外发布小芽等 agent，被外部调用），后做 **client**（deepagents 的 async subagent 指向远端 A2A agent）。
- 现有架构改动：新增一个域模块（契约进 types 包）；复用 JWT Guard（对外场景加 API-Key/签名 Card 鉴权映射）；不触碰编排核心内部。
- 风险：① 多租户身份映射（Supabase JWT ↔ A2A 调用方身份）需设计白名单；② Task 生命周期持久化（checkpointer 可承载，需映射实验）；③ `input-required` 中断语义与 HITL 打通。

**c. PoC 规格**（P3 阶段，验收即规格）

1. 小芽 agent 以 A2A server 形态在本机暴露，Agent Card 可被 `curl /.well-known/agent.json` 发现；
2. 用 LangGraph 官方 A2A client（或最小 JSON-RPC 脚本）提交一个 Task（"总结这段运营周报"）；
3. 验收：Task 状态完整流转（submitted→working→completed）、Artifact 回传内容正确、SSE 中间进度可见；
4. 边界用例：abort 一个 working 状态 Task，确认服务端中断透传（复用骨架 AbortSignal 链路）。

**d. 技能路线图**：① a2a-protocol.org 规范通读（Task/Message 区分）→ ② Agent Card schema 与签名 → ③ LangGraph A2A 适配层实战（PoC）→ ④ 鉴权与多租户映射 → ⑤ 生产部署（反向代理、限流、监控）。

### 2.2 OKF（Open Knowledge Format）

**a. 技术评估** [F]

- 协议：Google Cloud 2026-06 发布 v0.1（知识 = 带 YAML frontmatter 的 Markdown 目录；type/title/description/resource/tags/timestamp 六字段；纯文件、无运行时、无 SDK）。v0.2 增补：**信任分级**（unverified → machine-confirmed → human-reviewed）、**溯源**（sources + 逐断言归属）、**生命周期**（status/stale_after）、**认证计算**。
- 生态位：把"LLM wiki"模式标准化（Karpathy gist 的正式化）；是**格式**不是平台，天然可 Git 管理。
- 工具：官方参考实现绑定 Python/Gemini/BigQuery；vendor-neutral 替代为 **okf**（Go CLI，单二进制，JSON stdout，`okf schema` 自描述、`okf validate` 校验）；hermes-okf（Python，agent 记忆系统先例）。
- 兼容性：与仓库文档体系同构（Markdown + frontmatter + 相对链接），零运行时成本 [J]。
- 性能：读取成本 = 文件 IO；对 pgvector 检索无冲突（bundle 切片建索引即可）[J]。
- 学习曲线：**低**（格式极简）；难点在**治理**——信任分级与 stale_after 工作流需要纪律设计。

**b. 集成策略**（知识层格式标准 + agent 长期记忆载体）

- 知识域：`knowledge` 模块的上传文档在解析后以 OKF bundle 结构存档（Supabase Storage 或表内 md 文本）；frontmatter 携带 `user_id`、`status`、`trust`。
- 记忆域（新）：跨会话 agent 记忆 = OKF concept（偏好、经验教训、业务规则）；**trust tier 控制注入**——只有 human-reviewed / machine-confirmed 条目进系统提示或检索上下文 [J]。
- 双轨关系：pgvector 管"检索面"（相似度召回），OKF 管"事实面"（可读、可审计、可迁移）；bundle 为唯一真相，向量是派生索引 [J]。
- 现有架构改动：`knowledge/` 增加 OKF 解析/校验器（或直接复用 okf CLI 二进制）；新增 `memory/` 域（读注入中间件）；不改编排核心。
- 风险：① frontmatter 治理成本（需要 stale_after 清扫任务）；② 双数据源一致性（bundle 变更须重索引）；③ v0.2 尚新，字段面可能再变 [F]。

**c. PoC 规格**（P2 阶段）

1. 把小芽的 5-8 条运营知识（示例：周报格式偏好、禁用词汇表）写成 OKF bundle，`okf validate` 全绿；
2. agent 增加 `read_knowledge` 工具：运行时读取 bundle 并按 trust tier 过滤注入；
3. 验收：提问命中 bundle 内容且回答引用正确条目；stale_after 过期的条目不注入；
4. 对照组：同内容走朴素 pgvector 检索，比较可解释性（回答是否可溯源到具体文件）。

**d. 技能路线图**：① OKF v0.2 规范精读（信任/溯源/生命周期）→ ② okf CLI 实操（schema/validate/list）→ ③ frontmatter 治理设计（谁写、谁审、何时过期）→ ④ bundle ↔ pgvector 索引桥接 → ⑤ 记忆注入中间件开发。

### 2.3 RSI（Recursive Self-Improvement）

**a. 技术评估** [F]

- 定义：不更新模型参数，通过"经验采集 → 校验 → 固化为可复用记忆"循环持续改进 agent 的方法论。
- 代表工作（均为 2026-09 论文/研究代码，**非生产框架**）：
  - **RSIAgent**（arXiv:2609.15364，Aether AI + UCSD + UIC）：curriculum（决定学什么）/ actor（执行探索）/ verifier（用真实环境反馈校验）三角色 + broad-then-deep 探索 + 冻结记忆；在 OSWorld-v2 上让开源模型超 GPT-6 Astra。
  - **ModularRSI**（arXiv:2609.14857）：把可演化 harness 拆五模块（Agent Loop/工具使用/观察管理/上下文管理/完成检测）独立演化。
  - **Dream-RSI**（Google DeepMind）：把探索历史做成离线重放环境，演化"探索策略"本身。
- 兼容性：与 Deep Agents 中间件栈**同构**——RSI 的"记忆固化"对应我们的 OKF 记忆 + Store，"课程/验证"对应可加的中间件 [J]。
- 性能特性：探索期 token 成本前置放大（RSIAgent 用并行子代理探索）；收益集中在长尾任务的复用 [J]。
- 学习曲线：**高**——无成熟库，需借论文模式自研（这也是它排最后的原因）。

**b. 集成策略**（阶段 5 后置，骨架明确排除首期）

- 闭环设计：`message` 表 + LangSmith traces = **经验池** → curriculum agent 分析轨迹找知识缺口（"哪些任务反复失败/重复检索"）→ actor = 既有 Deep Agent（不新增）→ verifier agent 用真实环境反馈（evals 通过率、人工抽检）校验经验有效性 → 通过者固化为 **OKF 记忆条目（machine-confirmed）**，人工复核后升 human-reviewed。
- 现有架构改动：新增 `memory/` 域（与 OKF 共用）+ traces 导出管道（LangSmith API 拉取）；curriculum/verifier 是两个中间件级组件，不触碰主链路。
- 风险：① **成本失控**——探索循环必须带 budget 上限（max 调用数/日）与熔断；② 记忆污染——低质经验固化后伤全局，靠 verifier + trust tier + 人审门兜底；③ 循环偏航——curriculum 目标须锚定 evals 数据集，禁止开放式自我迭代 [J]。
- 明确不做：不引 RSIAgent 研究代码（Python、OSWorld 场景特定）；不演化 harness 本体（ModularRSI 路线超出当前阶段）[J]。

**c. PoC 规格**（P4 阶段）

1. 取 30 条历史对话轨迹（含失败与成功对）；
2. verifier 按"结论是否被后继事实支持"剔除不可靠经验；
3. 生成 ≤10 条 OKF 经验条目（machine-confirmed）；
4. A/B 验证：注入经验组 vs 空白对照组，跑同一 evals 数据集（≥20 题），LangSmith 打分；
5. 验收：注入组平均分 ≥ 对照组，且每条注入经验可溯源到原始轨迹；
6. 熔断验收：budget 上限触发后循环自动停止。

**d. 技能路线图**：① RSIAgent 论文精读（三角色与冻结记忆）→ ② LangSmith trace 分析实操 → ③ prompt 评估方法学（数据集构建、judge 一致性）→ ④ 记忆注入设计（与 OKF trust tier 联动）→ ⑤ 安全护栏（budget/人审/回滚）。

---

## 3. 技能提升框架

### 3.1 角色-能力矩阵

| 能力域 | 后端工程师 | AI 方向 | 前端工程师 |
|---|---|---|---|
| LangGraph/编排 | 使用 | **负责** | 了解 |
| Deep Agents harness | 使用 | **负责** | — |
| 模型注册表/流式 | 负责 | 协作 | 消费 |
| SSE/前端工作台 | — | 了解 | **负责** |
| Supabase 安全（JWT/RLS） | **负责** | 使用 | 了解 |
| A2A/OKF/RSI | 协作 | **负责** | — |

### 3.2 培训模块（每模块 = 目标 + 形式 + 产出验收）

| # | 模块 | 形式 | 验收产出 |
|---|---|---|---|
| T1 | LangGraph 基础 | 官方 TS quickstart + `langgraph-typescript-quickstart` skill 实操 | 本机跑通最小 graph（interrupt/resume 各一次） |
| T2 | Deep Agents harness | `deep-agents-core` skill + 官方 quickstart | 本机 Deep Agent 完成一次带工具调用的研究任务 |
| T3 | LangChain 工具与 MCP | `langchain-fundamentals` + `langchain.mcp` 文档 | 为小芽写 1 个自定义工具并挂载 |
| T4 | LangSmith 观测与评估 | 官方 tracing/evals 文档 + 本项目 traces | 一次真实对话的 trace 解读 + 10 题 evals 数据集 |
| T5 | Supabase 安全 | 既有 auth-verification 设计文档 + RLS 实操 | 为 message 表写 RLS 策略并通过两用户隔离测试 |
| T6 | A2A 协议 | §2.1 规范 + PoC 实操 | PoC 验收全过（§2.1c） |
| T7 | OKF 知识治理 | §2.2 规范 + okf CLI | PoC 验收全过（§2.2c） |
| T8 | RSI 评估方法 | §2.3 论文 + PoC | PoC 验收全过（§2.3c） |

T1-T4 为 **P0 必修**（M2 开工前置）；T5 随 M3；T6-T8 随对应 PoC。

### 3.3 实战载体

培训不单设沙盒——**三个 PoC + 四个里程碑（M2-M5）本身就是实训任务**，每个任务由受训角色主责、导师 review，代码走正常 OpenSpec 流程。

### 3.4 度量体系

| 维度 | 指标 | 采集方式 |
|---|---|---|
| 模块通过 | T1-T8 验收产出物 | 归档在 openspec change 的 tasks 勾选 |
| 工程质量 | test/typecheck/lint 全绿率、evals 通过率 | CI + LangSmith evals |
| 流式可靠性 | 中断恢复成功率、SSE 断连率 | LangSmith traces 统计 |
| 知识资产 | OKF human-reviewed 条目数、stale 清扫率 | okf list / 定时任务 |
| 技能反哺 | 每人沉淀的 Agent Note / 规则条数 | 仓库审计 |

质量反馈环：LangSmith **Tuned Evaluators** [F] 自动对生产 trace 附质量分，低分样本回流为 T4/T8 的训练材料。

---

## 4. 实施时间线与资源

### 4.1 阶段计划（串行推进，每阶段全绿门禁后进入下一阶段）

| 阶段 | 内容 | 前置 | 交付物 | 时长（估） |
|---|---|---|---|---|
| **P0 技术栈落地** | T1-T4 培训；M2 流式最小闭环（model-provider + ai 模块 + SSE 打字机 + abort） | 本规格批准 | agents 页真回复 | 2-3 周 |
| **P1 持久化与配置** | M3 会话/消息 + checkpointer 接线；M4 agent CRUD + 种子；T5 | P0 | 重启历史完整、多智能体切换 | 2 周 |
| **P2 知识与 OKF** | M5 RAG 基础 + OKF bundle 化 + OKF PoC（T7） | P1 | 检索命中 + 可溯源知识 | 2 周 |
| **P3 A2A 互操作** | a2a 域模块 + A2A PoC（T6） | P1（可与 P2 并行） | Agent Card 发布 + Task 流转 | 1-2 周 |
| **P4 RSI 试点** | memory 域 + 经验闭环 PoC（T8） | P2 + P4 前置 evals 数据集 | 注入组质量 ≥ 对照组 | 2-3 周 |

### 4.2 资源需求

| 资源 | 规格 | 说明 |
|---|---|---|
| 人力 | 1 名全栈（P0-P1 主力）+ 1 名 AI 方向（T1-T4 后接管 P2-P4）；单人串行为降级方案 | 角色矩阵见 §3.1 |
| 模型 API | DeepSeek 起步（成本最低档）；PoC/evals 另计探索预算（P4 设日调用上限熔断） | 金额以官方定价为准，此处不估绝对值 |
| LangSmith | 开发期 1-2 席位；不启则降级为本地 trace 落库 | 可选 |
| Supabase | 既有项目配额内（pgvector 扩展 + Storage 若用于 OKF bundle） | 免费/Pro 档视量 |
| okf CLI | Go 单二进制，开发机安装即可 | 无服务端成本 |

### 4.3 全局验收门禁

每阶段结束必须：`pnpm test` → `typecheck` → `lint` 全绿；涉及迁移跑 `verify:docs`；对应 OpenSpec change 归档；PoC 按各 §c 验收清单逐项勾选。

---

## 5. 参考

- Deep Agents v0.6/v0.7 与 changelog：langchain.com/blog/deep-agents-0-6 ；docs.langchain.com/oss/python/releases/changelog
- Deep Agents TS quickstart：docs.langchain.com/oss/javascript/deepagents/quickstart
- A2A v1.0：a2a-protocol.org/latest ；Linux Foundation 公告（150+ 组织）
- AP2（Agent Payments，A2A 扩展）：ap2-protocol.org
- OKF：cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing ；github.com/GoogleCloudPlatform/knowledge-catalog ；okf CLI：useokf.com
- RSIAgent：arxiv.org/abs/2609.15364 ；ModularRSI：arxiv.org/abs/2609.14857 ；Dream-RSI（DeepMind，2026-09）
- AG-UI：docs.ag-ui.com/concepts/architecture
- LangSmith（Managed Deep Agents / LLM Gateway 公测、Tuned Evaluators）：langchain.com/blog/august-2026-langchain-newsletter

## 变更记录

- 2026-09-25：初版。技术栈规格化；A2A/OKF/RSI 三技术评估与 PoC 规格；技能框架与四阶段时间线。
