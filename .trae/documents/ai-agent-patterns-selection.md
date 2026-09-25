# AI Agent 架构选型规划：多模式执行架构统一注入 deepagentsjs

状态：设计定稿（待实施）
关联：[ai-tech-spec.md](ai-tech-spec.md) §2.3 / [ai-rag-multiagent-design.md](ai-rag-multiagent-design.md) / [ai-architecture-review.md](ai-architecture-review.md)
标记约定：[F] = 事实（已核实官方文档/代码）；[J] = 判断（基于评估的设计决策）

## 0. 结论先行

1. **14 种执行/协作架构模式全部可注入 deepagentsjs 编排核心，无一需要更换编排框架** [F]。根因：deepagentsjs 本身是 LangGraph 状态图 + 中间件栈的预制封装 [F]，而下述所有模式均可分解为 LangGraph 原语（状态图 / 条件边 / 子图 / Send 并行 / interrupt）的组合。
2. 统一注入机制为 **模式注册表（pattern-registry）**：与 model-provider 注册表同构 [J]。agent 配置声明模式组合，运行时由工厂装配为子图与中间件——换模式 = 改配置，不改代码（与骨架决策 6 同构）。
3. 模式分三档落地：**原生已有**（ReAct / Plan-and-Execute / Supervisor / HITL，deepagentsjs 直接提供）、**中间件级新增**（Reflexion / Critic / ToT / DAG 并行 / Blackboard 深用）、**外部联邦**（A2A 远程代理 / MCP 工具流）。
4. 外部 Agent 生态统一抽象：**一切可委派实体 = 子代理**。本地子代理（SubAgentMiddleware）、A2A 远程代理（a2a-gate 桥接为委派工具）、MCP 工具流（tools-mount 挂载）三者对主代理暴露同一接口 [J]。

## 1. 选型清单（14 项）

相对成本 = 相对 ReAct 基线的 token 倍数（经验估算 [J]，落地后以 evals 实测修正）。

| # | 模式 | 核心机制 | 注入层级 | 相对成本 | 适用场景 |
|---|---|---|---|---|---|
| 1 | ReAct | 思考→行动→观察循环直至完成 | 主循环（deepagents 默认） | 1× 基线 | 通用任务执行 |
| 2 | Plan-and-Execute | 先产出计划逐步执行，偏差时重规划 | 主循环 + planning tool（原生） | 1.2× | 多步长任务 |
| 3 | Supervisor 层级委派 | 主代理拆解分派子代理并汇总 | SubAgentMiddleware（原生） | 1.3–2× | 跨域复杂任务 |
| 4 | Swarm / Handoff | 代理间直接移交控制权与上下文，无中央主管 | 子代理工具变体（自定义 handoff） | 1.2–1.8× | 对话型多角色切换 |
| 5 | Router 意图分发 | 分类后分发专职执行体 | intent 层条件边（已落地） | ≈0.1×（一次分类调用） | 入口分流 |
| 6 | Reflexion 自我反思 | 失败后语言化反思入记忆，重试时注入 | 中间件 + OKF 记忆 | +1 调用/失败 | 易失败长尾任务 |
| 7 | Generator-Critic | 生成与批判双角色迭代收敛 | 子代理对 | 1.5–2× | 高质量产出（文档 / 代码） |
| 8 | ToT / GoT 思维搜索 | 多分支推理 + 评估 + 回溯 | 专用搜索子代理 | 3–10× | 疑难推理深挖 |
| 9 | DAG 并行编排 | 任务图并行分支执行后聚合 | LangGraph Send/branch（自定义子图） | 总量不变、延迟 ↓50–80% | 多源检索 / 批量处理 |
| 10 | Blackboard 共享工作区 | 专家经共享工作区异步读写 | deepagents 虚拟 FS（原生深用） | 0.3–0.7×（省上下文重复） | 长文档多阶段处理 |
| 11 | HITL 人机协同 | 中断—审批—恢复节点 | interrupt 中间件（原生） | 人工延迟主导 | 敏感操作审批 |
| 12 | A2A 联邦委派 | 远程 agent 作为对等执行体 | a2a-gate 桥接为委派工具 | 网络延迟 + 对方计费 | 能力外购 / 生态协作 |
| 13 | MCP 工具联邦 | 外部工具服务动态挂载 | tools-mount 挂点 | 调用延迟 | 能力扩展 |
| 14 | RSI 记忆固化 | 经验→校验→OKF 固化→注入 | RSI 闭环（tech-spec §2.3 已设计） | 离线批处理 | 长期能力增长 |

## 2. 外部 Agent 生态的统一考量

外部生态不再视为"挂点附件"，而是与内部模式平级的执行架构来源 [J]：

- **A2A 远程代理**：Agent Card 发现 → 远程 agent 封装为委派工具 → 对主代理而言与本地子代理无差别。Supervisor 模式可无缝把任务委派给远程对等体（生态协作）。
- **MCP 工具流**：MCP server 的工具经 tools-mount 动态挂载，成为任意模式的行动空间（ReAct 的 Act、DAG 分支的执行体）。
- **统一契约**：可委派实体接口统一为 `delegate(goal, context, budget) → result`；本地子代理、A2A 远程、MCP 工具链三者实现同一契约。意图层分发（Router）由此获得三种执行后端而不感知差异。

## 3. 技术兼容性分析

deepagentsjs 0.7 架构事实 [F]：LangGraph 状态图 + 中间件栈（TodoList / Filesystem / SubAgent / HITL interrupt / 上下文管理）+ task 工具委派。模式 → LangGraph 原语映射：

| 模式类 | LangGraph 原语 | 兼容性 |
|---|---|---|
| 循环类（1/6/7/8） | 条件边 + 状态通道 + 循环 | ✓ 原生表达 |
| 委派类（3/4/12） | task 工具 / SubAgentMiddleware / 远程桥接工具 | ✓ 原生或一层桥接 |
| 分发类（5） | 条件边 | ✓ 已落地（intent 层） |
| 并行类（9） | Send API / branch | ✓ 需自定义子图 |
| 共享类（10） | FilesystemMiddleware 虚拟 FS | ✓ 原生深用 |
| 人审（11） | interrupt / resume | ✓ 原生 |
| 增长类（14） | RSI 闭环（§2.3） | ✓ 已设计 |

三个真实冲突点及对策：

1. **上下文预算叠加** [J]：Supervisor 内嵌 ToT 等多层组合会使上下文膨胀。对策：统一上下文管理中间件做逐层裁剪（deepagentsjs 0.7 已内置 summarization 通道），子代理默认最小上下文注入。
2. **状态 schema 冲突**：各模式子图自有 state，LangGraph 子图状态隔离天然规避 [F]；主图只交换 goal / result 两字段。
3. **递归深度失控**：委派链嵌套（Supervisor → 子代理 → ToT）。对策：全局 `recursionLimit` + 每模式 `maxCalls` 预算 + 任务级超时，复用 RSI 护栏机制（§2.3 风险①）。

明确不做 [J]：不引 RSIAgent 等研究代码；不做权重级训练；不演化 harness 本体（ModularRSI 路线维持排除，与 tech-spec §2.3 一致）。

## 4. 集成方案设计：模式注册表

与 provider-registry 同构 [J]，三件套 = 配置字段 + 装配工厂 + evals 门槛：

1. **配置**：agent 配置（数据库 agent 表）新增 `patterns` JSONB 字段，例：`{ "planner": "todo", "executor": "react", "critics": [], "delegate": ["local", "a2a"], "maxCalls": 25 }`。缺省值 = ReAct + TodoList，行为与当前默认一致。
2. **装配工厂**：`PatternRegistry` 按配置装配中间件与子图，输出 createDeepAgent 参数。模式实现隔离在 `patterns/<name>/`（子图 + 中间件 + 测试），主链路零硬编码。
3. **意图层联动**：intent 分发携带建议模式（metadata 弱提示）；默认模式优先，避免误路由。
4. **RSI 联动**：curriculum 分析结论可含"该类任务适合模式 X"；经 verifier 校验写入 OKF；注入时作为模式建议返回——**RSI 闭环覆盖模式选择本身**，模式组合也是可进化的记忆 [J]。

## 5. 性能影响评估

- **成本梯度**（见表 1）：ReAct 基线；Plan-and-Execute +20% 换成功率和可恢复性；Supervisor/Handoff 随委派深度线性放大；ToT/GoT 3–10× 仅限白名单场景；DAG 并行不增总量、显著降墙钟延迟。
- **延迟结构**：Router ≈ 一次分类调用；委派类每跳 +1 次调度调用；并行类取最慢分支。
- **护栏**（全模式强制）：`recursionLimit`（默认 25）、单任务 `maxCalls`、任务超时、日级 token 熔断——与 RSI 护栏共用同一实现（§2.3 风险①）。
- **观测**：全模式默认接 LangSmith tracing，按模式维度标注 span，支持使用率与成本归因 [J]。

## 6. 长期维护策略

1. **一模式一模块**：`patterns/<name>/` 内聚子图 / 中间件 / 单测；禁止模式逻辑散落主链路。
2. **版本锚定**：deepagentsjs 0.7、langgraph 1.x 经 catalog 钉住 [F]；升级走 openspec 变更 + 全模式 evals 回归。
3. **注册三件套**：新模式 = 注册表条目 + evals 子集（≥ 基线）+ 本文档条目更新；缺一不注册。
4. **退役机制**：LangSmith 按模式统计使用率，连续 30 天零调用降级为非默认；两期（P4/P5）零调用删除。
5. **升级风险**：deepagentsjs 中间件 API 变更是最大外部风险 [J]——中间件层做薄适配层（adapter），模式实现不直接 touch 上游类型。

## 7. 分阶段落地

| 阶段 | 模式 | 说明 |
|---|---|---|
| P0–P1 | ReAct / Plan-and-Execute / Router | 原生能力直接启用，intent 层已落地 |
| P2 | Supervisor / HITL / MCP 联邦 | SubAgent 与 interrupt 原生启用；MCP 随 tools-mount PoC |
| P3 | Reflexion / Generator-Critic | 依赖 OKF 记忆通道（P3 知识检索就绪） |
| P4 | A2A 联邦 / ToT·GoT / DAG 并行 | 预算护栏成熟后开放；A2A 随 tech-spec §2.1 PoC |

每阶段验收 = evals 数据集对照基线 + 成本报告（LangSmith 归因），未达标模式不上线 [J]。
