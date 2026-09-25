# Growth OS · 融合 RAG 与多 Agent 架构的智能系统方案

> 状态：方案设计（未实现）｜ 基线：[ai-tech-spec.md](ai-tech-spec.md)（技术栈规格）· 骨架 8 条决策 · [docs/diagrams/ai/](../../docs/diagrams/ai/)（现行四图）
> 本方案定义三个核心组件——**独立 RAG 系统**（§2）、**意图分析层**（§3）、**多 Agent 执行层**（§4），给出融合架构（§5）、兼容性与复杂度评估（§6）、可行性与风险论证（§7）。
> 标注约定同 tech spec：**[F]** 已验证事实（附来源，2026-09 检索）、**[J]** 工程判断、**[E]** 估算值。

---

## 1. 需求映射与设计目标

项目现状：骨架已锁（单引擎 deepagentsjs 三层栈 + SSE 流式 + 单库多轨数据层），M2-M5 里程碑里知识检索只规划了朴素 pgvector RAG。本方案回答三个递进问题：

1. 知识检索从"能用"到"好用"需要什么？（多跳问题、全局归纳问题朴素 RAG 的失败模式）
2. 不同意图（闲聊/问答/执行任务）是否该走同一条昂贵路径？（成本与延迟分层）
3. 复杂任务单 agent 循环够不够？（上下文与工具数增长时的退化）

设计目标：**按查询分层**——每条消息先识别意图，再选检索面（向量/图/摘要/不检索）与执行模式（轻量回复/ReAct/Plan/多 Agent 协作），而不是"一套大而全"。

---

## 2. 组件一：独立 RAG 系统

### 2.1 基线与失败模式

朴素 RAG（M5 既定：pgvector 切片 + top-k）在两类问题上失败 [F]：

- **多跳/多实体问题**：答案散落多文档，向量块各自"相关"却拼不出答案；
- **全局归纳问题**（"这批文档的主要主题是什么"）：没有哪一块是"最相关"的。

### 2.2 GraphRAG 家族评估 [F]

| 方案 | 核心机制 | 优势 | 局限 | 索引成本 | 查询成本 |
|---|---|---|---|---|---|
| 微软 GraphRAG | 实体抽取→知识图→社区聚类（Leiden）→分层社区摘要；Map-Reduce 全局搜索 | 全局 sensemaking 最佳 | 索引 LLM 开销大；细节召回弱（WildGraphBench：摘要任务上过度偏高层断言）[F] | 高 | 中 |
| LightRAG（HKU） | 双级（低层实体/高层主题）图 + 向量混合检索；增量索引 | 成本低、更新快、延迟低 | 丢失全局归纳质量 [F] | 低 | 低 |
| LazyGraphRAG | 索引延迟到查询时，LLM 层零索引成本 | 一次性查询/冷语料友好 | 单查询延迟偏高 [F] | ~0 | 中 |
| HippoRAG 2 | 海马体式记忆索引 + Personalized PageRank 多跳 | 多跳推理强、查询极快、图极密（每万 token 数千边）[F] | 图维护复杂 | 低 | 极低 |
| 蚂蚁 KAG | 图谱推理 + 逻辑符号约束 | 领域精确推理 | 学习曲线陡、成本中高 [F] | 中 | 中高 |
| OKF 知识层（已入图） | md+YAML bundle，trust 分级 | 事实面可审计、可迁移、与 pgvector 检索面天然分离（tech spec §2.2 既定） | 非检索技术，是治理层 | 极低 | 极低 |

**关键判据** [F]：ICLR 2026 GraphRAGBench（《When to Use Graphs in RAG》）系统证明——GraphRAG 在很多真实任务上**不及朴素 RAG**；图结构只在**层级化知识检索 + 深度上下文推理**场景有可测收益。结论：图检索是按需启用的面，不是默认替换。

### 2.3 本项目选型结论 [J]

1. **保留朴素 RAG 为默认面**（pgvector top-k + 混合 BM25），覆盖单跳事实问题——这是最高频场景，且 GraphRAGBench 表明朴素面在多数任务不输。
2. **图检索采用 LightRAG 思想的 TS 内实现**：实体表 + 关系表 + 实体→切片映射落 Postgres，双级检索（实体命中→扩展切片），增量索引。不引入微软 GraphRAG（索引成本高、全局归纳场景我们当前没有）。
3. **全局归纳面暂缓**（社区摘要表预留 schema 位，无场景不建）。
4. **OKF trust 分级贯穿所有检索面**：检索结果带 trust 标注注入，unverified 默认隔离——2026 年的前沿共识正是"trust-tier-aware retrieval"（防低信内容被自信引用）[F]。
5. **运行时断层处理**（关键约束）：主流 GraphRAG 实现均为 Python [F]，与 TS 单引擎栈冲突。解法=**离线/在线分离**：索引管道（实体抽取、切片向量化）允许 Python 工具批跑（数据 ETL，不违反"单引擎"——引擎指编排运行时），**产物全部落 Postgres 表；在线查询路径纯 TS/SQL，零 Python 依赖**。无 Python 环境时用 TS 实现简化版实体抽取（LLM 结构化输出直落库）。

### 2.4 RAG 域结构（modules/rag/）

```
modules/rag/
├── retrieval.service.ts    # 在线混合检索：pgvector + 实体图双级 + trust 过滤（TS/SQL）
├── intent-aware.policy.ts  # 检索面选择策略（§3 意图 → 检索面映射）
├── entities/               # 实体表 / 关系表 / 实体-切片映射（MikroORM）
└── indexer/                # 离线索引管道（TS 实现；Python 工具可选外挂）
```

---

## 3. 组件二：意图分析层

### 3.1 原理与职责

在编排图首位做一次**廉价的意图分类**（小模型 + zod 结构化输出），把"一条消息"变成"带意图标签 + 抽取槽位的结构化请求"。这是后续一切分层（检索面选择、执行模式选择、模型选择）的开关。

### 3.2 意图分类法（taxonomy）[J]

| 意图 | 触发示例 | 路由目标 |
|---|---|---|
| `chat` 闲聊/轻问答 | 问候、寒暄、常识问题 | 无工具轻量路径（低档模型，无检索） |
| `knowledge_qa` 知识问答 | "我们的退款政策是什么" | RAG agent（§2 检索面） |
| `task_execute` 任务执行 | "把这周的运营数据总结成周报" | Deep Agent（Plan/多 Agent，§4） |
| `agent_meta` 智能体元操作 | 配置人设、切模型、管理会话 | REST 控制面直通（不经 LLM 循环） |
| `ambiguous` 不确定 | — | **降级到 task_execute 通用路径**（宁贵勿错） |

### 3.3 实现形态（全 TS，栈内原语）[F]

- LangGraph **conditional edges**（意图节点输出 → 条件边分发）+ `Command`/`Send`（验证过的 1.x 原语）；
- 意图节点 = 一次 `withStructuredOutput` 调用（zod schema 进 `@growth-os/types`，复用现有契约管线）；
- 分类用低成本模型（DeepSeek chat 档），系统提示词带各 agent 的能力卡（agent 表的 persona/suggestions 即能力描述）。

### 3.4 优势与局限

优势：成本分层（闲聊不付检索+规划税）、延迟下降、意图可观测（LangSmith trace 里意图标签直接可查）。
局限与对策：**误判风险**——意图分类错误会把知识问答送进无检索路径。对策：① 各执行路径保留"能力外"自检（RAG agent 检索空结果→回退澄清；轻量路径检测到知识需求→升级重路由）② `ambiguous` 默认走最全路径 ③ 意图准确率进 evals 数据集持续度量。

---

## 4. 组件三：多 Agent 执行层

### 4.1 三种模式评估

| 模式 | 原理 | 优势 | 局限 | 本项目落点 |
|---|---|---|---|---|
| **ReAct**（推理-行动循环） | 思考→调工具→观察→再思考，直至收敛 | 简单鲁棒，工具调用即推理轨迹；`create_agent`/deepagents 默认形态 [F] | 无显式规划；长任务漂移；工具/上下文一多性能退化（官方实测：上下文膨胀显著拉低单 agent 表现）[F] | M2 即此形态，作为 `task_execute` 的短任务路径 |
| **Plan 架构**（Plan-and-Execute） | 先出完整计划，逐步执行，按结果重规划 | 长任务结构化、可预算、可中断续跑 | 规划质量依赖模型；简单任务过度规划（开销税） | **deepagents 内置 TodoList 规划** [F]——不是外挂而是 harness 自带，复杂任务自动启用 |
| **多 Agent 协作** | supervisor 收敛输入→派发子代理→回收结果；子代理上下文隔离 | 上下文隔离抗膨胀；并行执行；模块化可维护 [F] | 通信开销与 token 成本；supervisor 单点 | **deepagents SubAgentMiddleware** [F]：子代理（researcher=RAG 工具组 / executor=业务工具 / verifier 可选）以 `task` 工具委派；远端子代理走 async subagents + A2A 挂点（v0.5+）[F] |

**架构选型判据** [F]：官方多 agent 基准（τ-bench 变体）与 2026 案例研究（Included Health 联邦 supergraph：主图为对话路由器 + 领域子工作流 + Deep Agents 统一 harness）共同指向——**生产级多 agent 是"路由图 + 领域子图"的定制结构，而非通用拓扑**；官方 supervisor 实现经调优在该基准提升近 50% [F]。我们的意图层（§3）正是这个"主图路由器"。

### 4.2 模式路由规则 [J]

```
意图 → 模式：
  chat          → 轻量回复（无循环）
  knowledge_qa   → ReAct 单 agent（检索工具组）
  task_execute   → 复杂度自判（首轮 LLM 自评或任务特征）：
                    短任务 → ReAct（跳过规划，省 token）
                    长任务 → Plan（TodoList）+ 必要时 subagents
  跨域/远端      → async subagent / A2A
```

规则显式写在 `modules/ai/graph/` 的条件边里，不靠 prompt 隐式约定——可测、可调、可观测。

---

## 5. 融合架构设计

### 5.1 结构（文字版分层图）

```
Nuxt 工作台
  │ REST + SSE（Bearer JWT）
  ▼
NestJS ─ SSE 网关（鉴权/限流/可中断，不变）
  ▼
LangGraph 编排图（modules/ai/graph/）
  ① intent 节点 —— 小模型意图分类（zod 结构化输出）──┐
  ② 条件边路由（intent → 路径）                        │ 意图标签 + 槽位
     ├─ chat ──────► 轻量回复节点（低档模型）          │ 写入 state，全程可观测
     ├─ knowledge_qa ► ReAct agent（挂 rag 检索工具组） ◄─ modules/rag/（独立域）
     │                检索面：pgvector 混合 + 实体图双级 + OKF trust 过滤
     ├─ task_execute ► Deep Agent（TodoList 规划）
     │                 ├─ 短任务：ReAct 直行
     │                 └─ subagents：researcher（RAG）· executor（业务）· verifier
     │                     └─ 远端子代理 → A2A 挂点（外部 Agent 生态）
     └─ agent_meta ──► 直通 REST 控制面（零 LLM）
  ③ 流式回传（ChatStreamEvent，AG-UI 对齐，不变）
数据层（不变 + 扩展）：业务表 · checkpointer · pgvector(+BM25) · 实体/关系表(新) · OKF 知识库
离线（新增管道）：文档 → 切片 → 实体抽取 → 落库（TS 或 Python 工具批跑，产物皆 Postgres）
```

### 5.2 与骨架的兼容性检查

| 骨架决策 | 影响 |
|---|---|
| 1 渲染进程直连 / 不走 IPC | 无影响 |
| 2 契约进 types | 新增意图 schema、检索面枚举进 types 包 ✓ |
| 3 单引擎 | 不违反：意图层/多 Agent 均为 LangGraph 图内节点与 middleware；Python 仅限离线 ETL 可选 |
| 4 单库多轨 | 扩展两轨：实体表/关系表；OKF/向量/checkpointer 不变 |
| 5 REST+SSE 分面 | 无影响（意图分类在 SSE 流内，首事件可加 `intent` 标签） |
| 6 OpenAI 兼容注册表 | 意图分类用注册表中的低档模型行 ✓ |
| 7 三挂点 | A2A 挂点被多 Agent 层直接复用；MCP 挂点供 executor 工具扩展 |
| 8 云端约束 | RAG 检索面全 SQL，无状态可扩展 ✓ |

### 5.3 组件间集成复杂度矩阵 [J]

| 交叉点 | 复杂度 | 说明 |
|---|---|---|
| 意图层 ↔ 执行层 | **低** | 同图节点 + 条件边，栈内原语 |
| 意图层 ↔ RAG | **低** | 意图标签传参给检索面策略 |
| RAG ↔ 执行层 | **低-中** | 检索做成工具组（createDeepAgent tools），挂载即可 |
| RAG 内部（图检索面） | **中** | 实体抽取管道 + 双级 SQL，主要新代码量 |
| 多 Agent 协作 | **中** | subagents 配置 + 通信 token 预算调优 |
| A2A 远端 | **中** | 已有挂点设计（tech spec §2.1），本方案复用 |
| Python ETL（可选） | **中** | 运维面新增；用 TS 简化版可完全规避 |

---

## 6. 可行性论证

**技术可行性**：全部在线组件落在已锁技术栈原语内（conditional edges、structured output、deepagents TodoList/SubAgentMiddleware、pgvector、Postgres SQL），无第二编排引擎、无新运行时。意图层与模式路由是"图内加节点"，不动 M2-M4 已定结构。[J]

**经济可行性**：意图分层的意义正是省钱——闲聊/元操作不进昂贵循环 [E：此类轻量消息占比通常过半，具体比例待 M3 有真实流量后用 LangSmith 意图分布验证]。图检索仅对 `knowledge_qa` 高价值查询启用，索引成本随文档量线性可控（LightRAG 思想，非微软式全量社区摘要）。[E]

**预期性能提升**（均为估算 [E]，验收以 evals 数据集为准）：

| 维度 | 机制 | 预期 |
|---|---|---|
| 轻量消息延迟 | chat 意图跳过检索+规划 | 首 token 延迟下降约一半量级 |
| 多跳问答准确率 | 实体图双级检索 | 复杂问答 evals 提升（幅度以基准实测，WildGraphBench 显示多跳场景图检索收益明确 [F]） |
| 长任务完成率 | Plan + subagents 上下文隔离 | 官方基准：上下文膨胀下单 agent 显著退化、多 agent + 调优 supervisor 基准大幅提升 [F] |
| 单跳事实问答 | 朴素 RAG 保持默认 | 不退化（GraphRAGBench：多数任务图不占优 [F]），不为前沿付全量索引税 |

**潜在风险与对策**：

| 风险 | 等级 | 对策 |
|---|---|---|
| 意图误判 | 高影响 | 降级默认走全路径 + 各路径能力外自检 + 意图准确率进 evals |
| 图检索收益不达预期 | 中 | GraphRAGBench 已示警 [F]——图检索面做成**可关闭开关**，evals A/B 实测再定去留 |
| 索引管道成本 | 中 | 增量索引（LightRAG 模式）；用户文档量小则纯 TS 简化抽取 |
| 多 agent token 膨胀 | 中 | 子代理通信预算上限 + SummarizationMiddleware（deepagents 内置 [F]） |
| 新表/新管道拖慢 M5 | 中 | 实体图面**后置于 M5 朴素 RAG 验收之后**，作为独立增量 |

---

## 7. 实施路径（挂接 tech spec 时间线）

1. **P2 前半（不变）**：M5 朴素 RAG（pgvector + OKF bundle）先落地——它是本方案的默认检索面，先行验收；
2. **P2 后半（新增）**：意图层（意图节点 + 条件边 + 意图 schema 进 types）→ `chat`/`knowledge_qa`/`task_execute` 三路径跑通，evals 数据集带意图标签；
3. **P3（不变）**：A2A 挂点（远端子代理即多 Agent 层的天然延伸）；
4. **P4 扩展（新增，后置开关）**：实体图双级检索（实体表 + 离线抽取管道）→ evals A/B → 达标则常开，不达标则关闭留 schema。

每步独立验收、全绿门禁、走 OpenSpec 立项，与 tech spec §4 阶段制一致。

---

## 8. 参考

- GraphRAG 家族与 trust-tier 检索综述：thedatapraxis.com/blog/knowledge-graphs-for-ai-agents（2026-06）
- 《When to Use Graphs in RAG》GraphRAGBench：ICLR 2026（github.com/GraphRAG-Bench/GraphRAG-Benchmark）
- WildGraphBench：arxiv.org/abs/2602.02053（2026-02）
- LightRAG：arxiv.org/abs/2410.05779 · lightrag.github.io
- 多 agent 基准（τ-bench 变体 + supervisor 调优 +50%）：langchain.com/blog/benchmarking-multi-agent-architectures
- Included Health 联邦 supergraph 案例（Deep Agents + LangGraph）：langchain.com/blog（2026-09）
- 框架对位（LangChain/LangGraph/Deep Agents 生态）：langchain.com/resources/ai-agent-frameworks（2026-06）
- 栈内原语：LangGraph conditional edges / `create_agent` / deepagents TodoList / SubAgentMiddleware / async subagents（docs.langchain.com 及本仓 vendored skills）

## 变更记录

- 2026-09-25：初版。三组件评估（RAG 六选型 / 意图分类法 / 三执行模式）、融合架构、兼容矩阵、风险与实施路径。
