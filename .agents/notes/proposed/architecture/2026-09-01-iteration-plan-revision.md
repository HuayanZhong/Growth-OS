# Agent Note: 迭代计划修订——接缝三角色、应用架构、事件类型提前、插件化范围收窄

Status: proposed

## Problem

原迭代计划（`.trae/documents/iteration-plan.md`）对照 DeepSeek Harness（dsh）与 OpenHands V1 复核后暴露五个结构性问题：自研 DI 容器是对 Cordis 的低配重复；会话事件类型排在阶段三，晚于它所锚定的插件化设计；阶段四以"一切皆插件"为目标，对类 Coze 桌面产品是过度设计；文档被误标为优势项，实际缺 doc-typecheck、生成式目录和 cookbook；计划全是横向工程能力，纵向应用架构（产品域在前后端的组织）完全缺失——后端仅有 auth/health/throttle 基础设施模块，Agent/Session/Skill/File/Project 五个核心域无落点。

## Decision/Proposal

修订迭代计划，五项核心变更：

1. **砍掉自研服务容器**（原 2.2）。阶段二改用"接缝接口 + 显式依赖注入参数"过渡；若阶段四确认引入插件系统，再评估直接采用 Cordis。
2. **接缝采用三角色模型**：Service Definition（`packages/types/src/seams/`）/ Provider / Consumer，Provider 与 Consumer 互不 import。
3. **新增"应用架构目标态"章节 + 阶段二 2.6 产品域模块骨架**：领域地图定义五个核心域（Agent / Session-Chat / Skill / File-KB / Project）的前后端落点；后端 `modules/<domain>/{controller,service,entities}`、域间只走 service 注入，前端 feature 目录（`app/features/<domain>/`）+ typed client + `useApi` 只做传输层；骨架先行（空实现 + HTTP API 契约类型），业务随后填充。
4. **会话事件类型提前到阶段二**：`SessionEventMap` 区分 LLMConvertible 与内部簿记事件，含 turn/step 边界；阶段三只做持久化/回放/fork 落地，宿主为 sessions 域。运行时不变量："模型可见即已记录"。
5. **阶段四范围收窄**为能力适配器插件化 + 工具/技能包分发格式；Web UI 与 agent loop 明确列为非目标。

附带变更：阶段一新增 hygiene 工具链（knip/publint/重复检测）与会话 snapshot replay 测试；CI 并行化改为先单 job 内 turbo 任务图并行、量测后再拆 job；文档规范从 ✅ 降为 🟡，doc-typecheck + cookbook 进入阶段二待办；新增 foundation-over-blast-radius 立场（首个对外 release 前允许内部 breaking，不写兼容 shim）。

## Alternatives considered

- **保留自研 DI 容器**：被否。register/resolve 容器只有 Spring 式复杂度，拿不到 Cordis 的可逆副作用、类型化事件和作用域隔离；对单人项目是纯负担。
- **直接引入 Cordis**：被否（现阶段）。接缝 + 显式参数注入已满足当前扩展需求，引入插件框架应等到阶段四确认扩展面之后再决策。
- **维持"一切皆插件"目标**：被否。dsh 是 CLI agent 框架，插件化是其产品本体；Growth OS 的扩展需求是能力适配器可替换和工具包分发，把 UI 和 loop 也插件化没有对应需求支撑。
- **维持事件类型在阶段三**：被否。OpenHands V0→V1 的重构代价证明状态源词汇表必须先于依赖它的架构（插件化、fork、回放）定稿；类型定义成本低、返工成本高。
- **应用架构采用全局 store（Pinia）先行**：被否（现阶段）。Session 域的最终状态源是事件日志（阶段三），先上 store 会造成双事实源；其余域用域级 composables 过渡，事件系统就位后再评估。
- **域模块等业务功能实现时再建**：被否。骨架 + 契约先行成本极低（约两周），却给事件系统、插件化 Provider 迁移确定了落点，避免业务代码长完再搬家。
- **CI 直接拆多 job**：被否。三个各自 install 的 job 会引入重复 checkout/install 开销，很可能比单 job 更慢；turbo 本身已按任务图并行，应先量测。

## Consequences

- 阶段二交付物从"容器 + 接缝"变为"接缝三角色 + 域模块骨架 + 事件词汇表 + 文档门禁升级"，工时估算调整为 7-9 周。
- 会话 snapshot replay（阶段一 P0）依赖阶段二的事件格式，两处需协同；计划已注明"可提前借用格式"。
- 前端将出现 `app/features/` 与现有 `app/components/` 的边界：域内组件随 feature 走，跨域通用组件留 `components/`；迁移以 agents 域为样板，其余域随后。
- 首个对外 tagged release 前不承诺内部兼容性，breaking change 以 Agent Note 记录；发布后需重新收紧该立场。
- 后续若引入 Cordis，本 note 的"自研容器被否"决策不反转，仅"暂不引入"一条需新 note 交叉链接。
