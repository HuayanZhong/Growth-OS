# Growth OS · AI 架构全面审查报告

> 状态：审查报告（2026-09-26）｜ 审查对象：骨架 8 决策 + [ai-tech-spec.md](ai-tech-spec.md) + [ai-rag-multiagent-design.md](ai-rag-multiagent-design.md) + [docs/diagrams/ai/](../../docs/diagrams/ai/) 四图 + 已实现基建代码
> **审查口径**：AI 编排域当前为设计态（代码未实现）——§1/§2 为设计逻辑审查；auth/health/throttle/audit 为已实现代码态；§3 成熟度评估区分"设计成熟度"与"实现成熟度"。发现编号 G#，每条给证据与建议挂接阶段（P0-P4，对齐 tech spec §4）。

---

## 1. 业务流程完整性与闭环审查

### 1.1 六条流程 trace

| # | 流程 | 闭环判定 | 依据 |
|---|---|---|---|
| F1 对话主链 | Nuxt→SSE 网关→意图层→执行→SSE 回传→message 落库→历史加载 | **闭环** | 时序图/工作流图覆盖往返全程 |
| F2 知识链 | 上传→OKF bundle→切片→pgvector/实体图→检索→trust 过滤→注入 | **闭环** | 数据流图 + 方案 §2 |
| F3 中断异常链 | 断连→AbortSignal 透传→半截落库（interrupted）→checkpoint 保断点 | **闭环** | 时序图中断分支 |
| F4 HITL 链 | interrupt() 挂起→Command(resume) 恢复→循环继续 | **闭环**（缺超时，见 G6） | 工作流图 |
| F5 认证链 | 登录→Supabase JWT→双轨验证 Guard→403 本地降级 | **闭环**（已实现，M1 测试覆盖两分支） | auth-verification-design + 代码 |
| F6 RSI 链（后置） | 轨迹采集→curriculum 找缺口→verifier 校验→OKF 固化（machine-confirmed）→trust 分级注入 | **设计闭环** | 方案 §2.3 |

### 1.2 逻辑断点清单

| # | 断点 | 严重度 | 挂接 |
|---|---|---|---|
| G1 | `ChatStreamEvent` 契约缺**澄清/意图升级**事件：检索空结果→澄清提问、chat→QA 升级重路由均无前端可感知的事件类型 | 高 | P0（types 契约定稿前必须补） |
| G2 | `run_finish.usage` 的**多级聚合规则未定义**：subagent/工具内嵌调用的 token 如何归集到会话级 | 中 | P1（M2 落 usage 时定义） |
| G3 | OKF `stale_after` 清扫**无归属模块**（谁跑、多久跑、失败重试） | 中 | P2（memory 域立项时） |
| G4 | bundle 变更→**重索引触发器未定义**（pgvector/实体图与 OKF 事实面的一致性依赖它） | 中 | P2 |
| G5 | 模型调用**重试/熔断/降级矩阵未定义**：429/超时/内容策略错误各几次重试、注册表内 fallback 顺序、熔断窗口 | 高 | P0（M2 model-provider 落地时一并定） |
| G6 | HITL 挂起**超时策略未定义**（interrupt 后多久过期、过期后状态落库语义） | 中 | P1 |
| G7 | RSI **经验回滚机制未定义**：低质记忆固化后如何标记降级/清除（trust 降级 ≠ 删除） | 低 | P4 |
| G8 | **poison message 隔离未定义**：单条输入反复导致编排崩溃时的隔离与告警 | 低 | P1 |

---

## 2. 核心业务逻辑正确性

### 2.1 已实现代码态（审查通过，无发现）

- **auth**：JWKS 双轨验证 + HS256 回退、`@Public()` 豁免、`@CurrentUser`——M1 测试覆盖无 token/有 token 两分支，符合 [guard 规则](../rules/server/auth/guard.md)。
- **audit**：append-only 设计（seq 主键 + 索引齐备），迁移含 Supabase `rls_auto_enable` 维护。
- **throttle**：全局 Guard 先于 JWT 执行。
- **health**：liveness（无依赖 200）/ readiness（DB ping 503）分层，符合探针规则。
- 结论：基建层逻辑正确，异常路径有测试兜底。

### 2.2 设计态逻辑审查

**条件判断**——意图四路分发 + `ambiguous` 降级默认全路径（宁贵勿错）设计正确；模式路由规则"显式写在条件边，不靠 prompt 隐式约定"，可测可调 ✓。

**数据处理**——双轨职责分离（message 对外事实 / checkpointer 引擎态）正确；但发现关键缺口：

> **G9（高）：checkpointer 自管表的用户隔离未设计**。Supabase 触发器会对新表自动启用表级 RLS，LangGraph checkpointer 建表无策略=默认拒绝/放行不可控；且 `thread_id → user_id` 的映射与校验（防越权读他人 thread）未定义。**这是数据隔离正确性的最大缺口**。挂接 P0：M3 会话持久化立项时必须含 checkpointer RLS 策略 + thread 归属校验。

**异常处理**——已定义：ApiErrorEnvelope（5xx 隐藏内部细节）、SSE `error` 事件、中断半截落库、RSI budget 熔断。未定义：G5（重试矩阵）、G8（poison 隔离）、subagent 失败传播策略（子代理失败 N 次是否熔断整个 run）——建议并入 G5 一并定义。

**安全性专项**：

| 风险 | 现状 | 差距 |
|---|---|---|
| API Key | 服务端 env，客户端零接触 | ✓ 已达标 |
| 传输/输入校验 | zod 全端点 + ZodValidationPipe | ✓ 已达标 |
| RLS | 业务表触发器自动启用 | 策略未落地（known）+ G9（checkpointer） |
| Prompt injection | trust 分级部分缓解 | verifier LLM 自身可被注入（unverified→confirmed 判定链），检索内容注入系统提示无消毒约定 → **G10（中）**：P2 定义检索内容转义/标记约定 |
| 工具执行审批 | interrupt() 原语可用 | 哪些工具需人工审批未分级 → **G11（中）**：P1 定义工具风险分级表 |
| AI 决策审计 | audit 表存在 | 回复溯源（引用了哪些检索片/经验条目）未设计 → **G12（中）**：P2 随 evals 落 trace→message 关联 |

---

## 3. 架构成熟度评估（对照企业级标准）

基准取 12-Factor（配置/依赖/并发/可处置性）+ Well-Architected 五支柱。**设计成熟度 / 实现成熟度分开打分**（0-5）。

| 维度 | 设计成熟度 | 实现成熟度 | 企业级基准 | 关键差距与改进 | 挂接 |
|---|---|---|---|---|---|
| 可扩展性 | 4 | 2 | 无状态水平扩展 | ① SSE 长连接绑定实例——云端期需 sticky session 或升级 pub/sub（Redis 背压/多实例广播）→ **G13**；② 长任务同步执行，worker 队列缺失（D2 已预留抽包触发条件，预案在但未细化）；③ 检索缓存未设计 | 云端期 / P2 |
| 可维护性 | **5** | 3 | 契约先行/单一真相源 | 强项：契约包、单引擎收敛、图 JSON 源、OpenSpec 流程、文档门禁全绿。差距：**evals 数据集版本化与回归门禁未定义**（改 prompt/换模型无质量回归防线）→ **G14** | P1 |
| 安全性 | 3 | 3 | 纵深防御 | G9/G10/G11/G12 四项（见 §2.2）；A2A/MCP 挂点启用前需信任边界定义（Agent Card 白名单） | P0-P2 |
| 性能 | 4 | 1 | SLO 数字化 | 意图分层省成本 [E]、流式首 token 体验好；差距：**无 SLO**（首 token P95、检索 P95、编排成功率）——建议 P0 只定 3 个核心 SLO，量化后续优化 | P0 定标 |
| 容错能力 | 3 | 2 | 优雅降级 | durable execution + 中断恢复是强项；差距：G5 重试矩阵、降级链（模型不可用→注册表次选→只读模式）、graceful shutdown（langgraph v1.2 节点级优雅停机 [F]——直接采用即可） | P0 |

**总评**：设计成熟度 3.8/5（企业级设计线以上），实现成熟度 2.2/5（符合"设计先行"的阶段预期）。当前架构无结构性返工风险；所有差距均为**补齐型**而非**推翻型**。

### 3.1 差距优先级汇总

| 优先级 | 项 | 行动 |
|---|---|---|
| **P0（阻塞首期上线）** | G9 checkpointer 隔离、G5 重试矩阵、G1 澄清事件、3 个核心 SLO | 并入 M2/M3 立项范围，不新增阶段 |
| **P1（上线一个迭代内）** | G2 usage 聚合、G6 HITL 超时、G11 工具分级、G14 evals 门禁、G8 poison 隔离 | 各域 milestone 内消化 |
| **P2（知识/记忆期）** | G3 清扫、G4 重索引、G10 注入消毒、G12 决策审计、检索缓存 | 随 P2/P4 立项 |
| **云端期** | G13 SSE 多实例、worker 拆分细化 | 上云前专项 |

---

## 4. 结论

1. **闭环性**：六条业务流程全部闭环，无结构性逻辑断点；8 个设计缺口（G1-G8）均可在现有里程碑内补齐，不需要变更骨架。
2. **正确性**：已实现代码态无发现；设计态最大缺口是 G9（checkpointer 用户隔离）——已列为 P0，建议随 M3 立项第一优先。
3. **成熟度**：设计已达企业级线，实现按里程碑推进即可；审查产出的 14 项差距（G1-G14）已全部编号、定级、挂接阶段，可直接并入对应 OpenSpec 立项的验收清单。

## 变更记录

- 2026-09-26：初版审查。F1-F6 流程 trace、G1-G14 差距清单、五维成熟度评分。
