# Agent Note: 迭代计划修订——以现有机制为基座的渐进补全

Status: proposed

## Problem

原迭代计划（`.trae/documents/iteration-plan.md`）对照 DeepSeek Harness（dsh）与 OpenHands V1 复核后暴露两类问题：

1. 结构性缺口：自研 DI 容器无必要；会话事件类型晚于依赖它的插件化设计；阶段四"一切皆插件"对类 Coze 桌面产品过度设计；文档缺 ts 代码块检查；产品核心域（Agent/Session/Skill/File/Project）在前后端均无落点。
2. **照抄问题（用户指出）**：多处把 dsh 的体系原样搬入而非在现有机制上补全——seam 三角色术语、YAML 四层配置、Cordis 五种分发模式、独立的 doc-typecheck 工具链、dsh 口号。

## Decision/Proposal

修订迭代计划，确立总原则：**以现有架构为基座（IPC 契约派生、useApi、NestJS 原生 DI、dotenv 级联 + zod 校验、verify-docs 门禁、MikroORM），对标设计只补缺口，落点一律是扩展现有机制，不引入平行体系。**

核心决策：

1. **DI：用现有机制，不自研容器**。后端 NestJS provider，前端 composable 参数注入；阶段四若需作用域隔离再评估 Cordis。
2. **能力适配器接口**（原"seam 三角色"）：接口定义在 `packages/types/src/adapters/`，沿用 `ipc-channels.ts` 的契约派生模式；实现方与调用方互不 import。
3. **会话事件类型提前到阶段二**：消息事件与簿记事件分离、含 turn/step 边界；运行时不变量"模型可见即已记录"；阶段三只做落地，宿主为 sessions 域。
4. **配置分层：扩展 .env 级联，不引入 YAML**。新增 `.env.local` 覆盖层；zod schema 收敛到 `packages/shared` 前后端一份；前端走 Nuxt runtimeConfig。
5. **文档升级并入 verify-docs**：ts 代码块编译检查、生成式目录、cookbook 全部作为 `verify-docs.cjs`/`scripts/` 的扩展，同一门禁命令。
6. **事件总线最小化**：只做类型化 on/emit，分发模式（waterfall/parallel/bail）出现真实消费者再按需实现。
7. **阶段四收窄为能力适配器插件化**：插件 = 带元数据的适配器包（package.json `growthos` 字段），Web UI 与 agent loop 明确非目标。
8. **应用架构目标态 + 阶段二 2.6 域模块骨架**：五域后端 `modules/<domain>/`、前端 `app/features/<domain>/`，骨架先行（空实现 + HTTP API 契约）。

## Alternatives considered

- **引入 dsh 式 YAML 四层配置**：被否。仓库已有 dotenv 级联 + zod 校验，差距只是覆盖层和前端打通，为此换配置体系是用新平行系统解决现有机制的小缺口。
- **独立 doc-typecheck 工具链（type-equiv manifest）**：被否。verify-docs 已是唯一文档门禁，新增检查项即可，不需要第二套工具和 manifest 机制。
- **Cordis 五种分发模式全量实现**：被否。当前无任何消费者需要五种模式，属为不存在的需求建机制。
- **自研 DI 容器**：被否。register/resolve 式容器只有复杂度没有对应收益，现有 NestJS DI + composable 注入已覆盖需求。
- **直接引入 Cordis**：被否（现阶段）。等阶段四确认插件系统需要作用域隔离后再评估。
- **"一切皆插件"**：被否。dsh 是 CLI agent 框架，插件化是其产品本体；Growth OS 的扩展需求是适配器可替换 + 工具包分发。
- **Pinia 先行**：被否（现阶段）。Session 域最终事实源是事件日志，先上 store 造成双事实源。
- **域模块等业务实现时再建**：被否。骨架 + 契约先行成本约两周，却给事件系统和插件化确定落点。

## Consequences

- 每项对标改进都必须先回答"我们已有的对应机制是什么"；回答不了的（如会话事件溯源、域模块）才是真正的从零新建。
- 阶段二交付物：适配器接口 + 域模块骨架 + 事件词汇表 + verify-docs 扩展 + .env.local，工时 6-8 周。
- 会话录制-回放（阶段一 P0）依赖阶段二事件格式，两处协同；计划已注明"提前借用格式"。
- 前端将出现 `app/features/` 与 `app/components/` 的边界：域内组件随 feature 走，跨域通用组件留 `components/`；agents 域为样板。
- 首个对外 tagged release 前不承诺内部兼容性，breaking change 以 Agent Note 记录。
- 后续若引入 Cordis，"自研容器被否"不反转，仅"暂不引入"需新 note 交叉链接。
