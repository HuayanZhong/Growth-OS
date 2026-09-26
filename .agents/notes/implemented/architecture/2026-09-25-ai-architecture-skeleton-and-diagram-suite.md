# Agent Note: AI 架构骨架决策与架构图套件落位

Status: implemented

## Problem

2026-09-13 teardown 后 AI 域无任何设计基线：旧方案（`.trae/documents/ai-module-plan.md`）被用户判定过时作废，AI 架构需要重新定骨架；同时架构图产物此前散落在 `.trae/documents/`（设计文档目录），不符合文件组织规范。

## Decision/Proposal

**骨架 8 条决策（用户已确认锁定）**：

1. 链路：Nuxt 渲染进程 HTTP/SSE 直连 NestJS；Electron 主进程只管 secureStore/更新/OAuth，AI 数据不走 IPC
2. 归属：AI 代码住 `apps/server/src/modules/`，跨端契约住 `@growth-os/types`；前端 bundle 零 AI 依赖
3. 单引擎：deepagentsjs（harness）+ langgraph（runtime）+ langchain（framework）三层栈一体，编排收敛单一 graph 目录
4. 数据：单库双轨——业务表（MikroORM）+ checkpointer 自管表 + pgvector（知识期启用），业务表带 user_id 隔离
5. 接口分面：控制面 REST + 数据面 SSE（ChatStreamEvent 契约，命名对齐 AG-UI 生命周期语义）
6. 模型：仅 OpenAI 兼容协议 + provider 注册表，换供应商改数据不改代码
7. 挂点：AG-UI 事件 / MCP 工具 / A2A 子代理三处只留门不实现
8. 部署：本机起步、按云端约束设计（Key 只在服务端环境变量）

**图套件落位**：`docs/diagrams/ai/` 存放四张图（架构总览 / 对话时序 / 编排工作流 / 数据流转），每图 JSON 为源、HTML 为 archify 交付物、浏览器证据归 `visual-check/` 子目录。

## Alternatives considered

- **沿用旧 ai-module-plan.md**：拒绝——用户明确作废；其中 M1 鉴权骨架仍有效但不作为设计基础。
- **围绕 OKF/RSI 等热点技术设计**：拒绝——它们是技术菜单样例而非架构中心；降级为知识层/记忆层的可插拔选项。
- **Python deepagents sidecar**：拒绝——多一个运行时服务；deepagentsjs 与 NestJS 同进程，接口按可拆分设计留退路。
- **跨列 resume→model 回边**：拒绝——工作流图中该回边连续违反五类路由约束（穿节点/共走廊/穿标签），改为 resume→decide 相邻列回边，Command(resume) 后继续推理循环，语义等价、几何可行。
- **单张巨图（diagram-design 手绘）**：拒绝——五维度信息超单图预算；拆为架构/时序/工作流/数据流四视图，各自过 archify showcase 校验（9/9 检查、0 错误 0 警告、四视口浏览器证据全 pass）。
- **总览图补三条语义边（intent→langchain"意图 LLM 调用"、rag-domain→provider"embedding 调用"、deepagents→domains"消息 / usage 回写"）**：showcase 档下拒绝——intent 四侧锚点被 sse-intent / intent-task / intent-meta 占满，checkpoint 垂直段封死右下走廊，tools-mount 与 mcp-gate 封死下通道，且 intent-model 与 checkpoint 的下降通道几何互锁（2026-09-26 全图坐标推导证明，重排 intent 锚点、互换 checkpointer/entity-graph 均无解）。**最终落地方案（2026-09-26，用户确认）**：质量档 showcase → standard（交叉禁令为 showcase 专属规则），三条边以最短直路线入图，共接受 5 处可读边交叉（intent-model × checkpoint、rag-model × mcp-gate、reply-write × authz/entry/contract-svc）；基础 22 条边的路由保持 showcase 时代的无交叉设计不变。语义与卡片文字描述一致：意图 / embedding 调用走 langchain 抽象层汇聚 model-provider 单点，消息 / usage 由编排核心回写业务域。

## Consequences

AI 域后续立项（流式闭环、会话持久化、智能体配置、知识检索）按此骨架逐域走 OpenSpec（契约先行：types → server → 前端 → 测试）。图源 JSON 是唯一编辑入口，改图改 JSON 后须重走 `validate → deliver → visual-check`；`.trae/documents/` 回归纯设计文档目录。

技术栈细化规格、前沿技术（A2A/OKF/RSI）集成评估与技能提升框架见 [.trae/documents/ai-tech-spec.md](../../../../.trae/documents/ai-tech-spec.md)。

**RSI 中心化补全（2026-09-26，用户确认定位"系统围绕 RSI"）**：总览图新增 **经验池** 节点（数据层第六轨，traces + 用户反馈）与 6 条闭环边——langsmith→经验池（traces 导出）、nuxt→domains（用户反馈）、domains→经验池（经验入库）、经验池→deepagents（curriculum 分析，子代理方案）、deepagents→OKF（verifier 固化）、OKF→tools（记忆注入，经 retrieve_knowledge）——并新增 rsi-loop 视图。架构决策采纳 A 方案：curriculum / verifier 为 deepagents 子代理（SubAgentMiddleware），不新增常驻组件，与"单引擎"骨架决策一致。质量档同步 showcase → standard（交叉禁令为 showcase 专属；standard 下以可读交叉换语义完整性，基础边路由保持原无交叉设计）。RSI 闭环的运行机制细节（budget 护栏、记忆冲突仲裁、evals 数据集管理）见 tech-spec §2.3，P4 落地。

**多模式执行架构选型（2026-09-26）**：14 种执行/协作模式（ReAct / Plan-and-Execute / Supervisor / Handoff / Reflexion / Critic / ToT / DAG 并行 / Blackboard / HITL / A2A / MCP 联邦等）确认全部可注入 deepagentsjs，统一机制为模式注册表（与 provider-registry 同构，换模式=改配置）；外部 Agent 生态统一抽象为"可委派实体 = 子代理"。总览图同步落位：**模式注册表节点**（provider-registry 正上方同列对称）+「按配置装配模式」边入 deepagents + 外部生态「能力注册」虚线边（Agent Card / MCP 清单注册进注册表，与本地子代理统一委派；A2A/MCP 边标签改为委派语义），deepagents 职责标注升级为"多模式编排"。选型论证与分阶段落地见 [.trae/documents/ai-agent-patterns-selection.md](../../../../.trae/documents/ai-agent-patterns-selection.md)。

**图套件拆分为总览 + 6 详图（2026-09-26，用户逐张确认）**：主图定稿后按 C4 分层拆出 6 张详图——① RSI 闭环（growth-os-ai-rsi-loop，13 节点/4 区域）、② 知识摄取管线（growth-os-ai-ingest-pipeline，12 节点）、③ RAG 检索内部（growth-os-ai-rag-internal，13 节点）、④ 多模式注册与装配（growth-os-ai-pattern-assembly，21 节点，14 模式清单来自 ai-agent-patterns-selection.md 逐项核对）、⑤ 模型接入（growth-os-ai-model-access，9 节点）、⑥ 观测与评估（growth-os-ai-observability，9 节点）。统一版式约定：**viewBox 宽固定 1250**（实测 900 宽会被 1440 视口 1.6x 放大导致全视口溢出——viewBox 宽度决定渲染缩放，1250 下 1.15x 安全）、纵向分层、右/左翼回流走廊承载 emphasis 闭环边、强调色主干边、sources 统一挂 `apps/desktop/app/composables/useApi.ts`。同时删除 chat-sequence / dataflow / orchestration-workflow 三张冻结图（确认全仓库零引用后删 24 文件）——信息已被主图 + 详图覆盖，本节替代前文"四张图落位"决策。

**导航页 + 大画布融合图双轨（2026-09-26，用户确认豁免方案）**：新增 [index.html](../../../../docs/diagrams/ai/index.html) 五层导航（L0 总览含融合图 / L1 数据闭环 / L2 知识管道 / L3 执行架构 / L4 质量保障）。单图融合诉求经物理边界核算拒绝 archify 方案：47 节点需 viewBox ≥2500，1440 视口文字投影 4.7px 低于 6px 可读阈值（archify 实测上限即主图 23 节点）；改由 diagram-design 交付大画布融合图 [growth-os-ai-unified.html](../../../../docs/diagrams/ai/unified.html)（2320×1560、43 节点/44 边、七分区底色、橙色主干：装配→出网→记忆注入→top-k 回流），显式豁免其 9 节点预算并页脚注明。**双轨定位**：融合图管"一页看全"（演示/总览），archify 分图管"单屏可读细节"；图源 JSON 仍是唯一编辑入口，融合图为手绘 SVG 无 JSON 源，改结构需直接改 HTML 后重走 self_check + verify:docs。

**旧产物清理落地（2026-09-26，用户指令"先清理掉旧的"）**：探索实施路径时用户判定"设计定稿前的旧决定需清理重想"，落地三项：① 删除作废总方案 `.trae/documents/ai-module-plan.md`（doc-budgets manifest 条目、auth-verification-design.md 与两个 2026-08-25 note 的链接同步修复，verify 三段全绿）；② 删除空壳 change `rebuild-sessions-domain`（无 proposal，specs 下 4 个能力目录全空）；③ **`packages/types/src/adapters/llm.ts` 处置延后**——清理清单初判"删除"经全仓库引用扫描否决：它是 teardown 时显式保留的平台级契约（2026-09-13 design 原文）+ 双语 cookbook（llm-adapter.md/.zh.md）主题 + 4 张 archify 详图的 repository-evidence 锚点，误删将挂 validate/source-required。其去留归实施第一刀（立 ChatStreamEvent 契约）时的设计决策：改造为 provider-registry 接口或删除由 langchain 抽象接管，同变更带上 cookbook 与图证据。实施路径归零重推导的渐进切刀新框架（替代 tech-spec §4 的 P0-P4/M2-M5 引用）尚未获用户确认，未登记。
