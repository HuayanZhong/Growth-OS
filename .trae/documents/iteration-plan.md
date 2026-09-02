# Growth OS 架构迭代方案

> 对标 DeepSeek Harness（dsh）与 OpenHands 的分阶段演进计划。
> 原则：以 Growth OS 现有架构为基座，只借鉴别家验证过的设计思想，落点一律是扩展现有机制，不引入平行体系。

---

## 背景

Growth OS 是一个类 Coze 的 AI Agent 桌面平台，采用 Nuxt 4 + NestJS + Electron + Supabase 技术栈。通过与 DeepSeek Harness（基于 Cordis 插件系统的开源 Agent 框架）和 OpenHands（V1 Software Agent SDK）对比，得出以下差距评估：

| 维度 | Growth OS 现状 | DeepSeek Harness / OpenHands | 差距等级 |
|------|----------------|------------------------------|----------|
| 可扩展性 | 模块化单体，需改代码 | 一切皆插件，热插拔 / 模块化 SDK | 🔴 大 |
| 可观测性 | 基础日志 | 事件溯源，完整审计 | 🔴 大 |
| 配置管理 | .env 级联 + zod 校验 | Profile/Bundle/Patch 四层 | 🟡 中 |
| 状态管理 | 组合式函数单例 | 服务容器 + 依赖注入 | 🟡 中 |
| 文档规范 | 链接/字数/双语 hash 机器检查 | 缺 ts 代码块检查、生成式目录、cookbook | 🟡 中 |
| 类型安全 | 全链路 IPC 类型派生 | 类型化服务/事件 | ✅ 持平 |

**三条总体策略**：

1. 保持优势：类型派生（IPC 契约 → `DesktopAPI`）、文档门禁、双语校验。
2. **在现有机制上补全，不另起炉灶**：每项对标改进先问"我们已有的对应机制是什么"，缺什么补什么（检查项、分层、不变量），不引入新术语体系、新配置系统、新容器。
3. 首个对外 tagged release 之前优先正确的地基：允许内部 breaking change，决策记录 Agent Note，不写兼容 shim，不背兼容债。

---

## 应用架构目标态

四个阶段解决的是横向工程能力；本节定义纵向应用架构——产品域在前后端的组织方式。

**当前现状**：前端 `app/components/` 已按功能域分目录（auth/chat/sidebar），但 `pages/dashboard/` 各页独立承载逻辑、无域级 composables 与状态层约定；后端仅有 auth/health/throttle 基础设施模块，产品核心域在前后端均无落点，是后续最大的架构空白。

### 领域地图（类 Coze 核心域）

| 域 | 职责 | 后端落点 | 前端落点 |
|----|------|----------|----------|
| Agent | Agent 编排：人设/模型/工具绑定、CRUD | `apps/server/src/modules/agents/` | `app/features/agents/` |
| Session/Chat | 会话生命周期、事件日志、消息投影 | `apps/server/src/modules/sessions/` | `app/features/chat/` |
| Skill | 技能包注册、目录、启用状态 | `apps/server/src/modules/skills/` | `app/features/skills/` |
| File/KB | 文件与知识库管理 | `apps/server/src/modules/files/` | `app/features/files/` |
| Project | 项目聚合根，串联上述资源 | `apps/server/src/modules/projects/` | `app/features/projects/` |

### 分层约定

**后端**（沿用现有 NestJS 分层）：`modules/<domain>/{controller,service,entities}`；controller 只做协议转换（zod 校验 + envelope），业务在 service，持久化在 entities/repository。域间调用走 service 显式注入（NestJS 原生 DI），禁止跨域直接查表。

**前端**：传输与业务分离——

- `useApi` 保持传输层职责（token 注入、错误信封解包），不膨胀业务方法
- 每个域一组 typed client（`app/features/<domain>/api.ts`），入参/返回类型来自 `packages/types` 的 HTTP API 契约（复用现有 IPC 契约派生模式）
- 页面（`pages/`）只做路由组装与布局，域逻辑在 feature 目录的 composables
- 状态：Session 域以事件日志为唯一事实源（阶段三落地后 UI 从事件投影）；其余域用域级 composables，事件系统就位后再评估是否引入 Pinia

### 与各阶段的衔接

- 阶段二 2.6 落地域模块骨架（空实现 + HTTP API 契约类型 + agents 域前端样板）
- 阶段三的会话事件系统宿主是 sessions 域
- 阶段四"迁移现有模块"即迁移各域的适配器实现

---

## 阶段一：工程化补齐（1-3 个月）

**目标**：补齐基础设施短板，提升开发效率和代码质量。

### 1.1 CI 优化

**当前状态**：单 job 串行执行 lint → typecheck → test → build，耗时 10+ 分钟。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 单 job 内改用 Turborepo 任务图并行（`turbo lint typecheck test`） | P0 | 0.5 天 | |
| 量测耗时，仅当仍超 5 分钟才拆分为多 job | P1 | 视量测结果 | |
| 添加 Turborepo 远程缓存（Vercel 或自建） | P1 | 1 天 | |
| 添加 `pnpm verify:docs` 到 CI | P1 | 0.5 天 | |
| 添加 commitlint 检查到 CI | P2 | 0.5 天 | |

**实现要点**：

```yaml
# .github/workflows/ci.yml 改造方向：先并行任务图，后考虑拆 job
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - pnpm install --frozen-lockfile
      # turbo 按依赖图并行执行，避免拆 job 带来的重复 install/checkout 开销
      - pnpm turbo lint typecheck test
      - pnpm build
```

> 注意：直接拆成 3 个各自 install 的 job 很可能比单 job 更慢（三次 install + checkout）。Turborepo 本身已按任务图并行，先量再拆。

### 1.2 测试分层

**当前状态**：核心 composables 有测试（已覆盖 useApi mock 路径），但缺会话级回归防护。

**分层策略**：unit（共享包高覆盖）+ e2e（无凭证自动跳过）+ **会话录制-回放**。

录制-回放的落点是现有 vitest 基建：录制产物存为 test fixture（事件序列 JSON），回放测试用现有 `apiFetch` mock 路径注入 fixture，断言消息投影与 UI 关键状态——CI 无 API key 也能跑，不新增测试框架。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 会话录制-回放测试（fixture + 现有 mock 路径，事件格式提前借用 2.3 的定义） | P0 | 1 周 | |
| `packages/shared` 测试（env.ts, normalize.ts） | P0 | 1 天 | |
| `packages/types` zod schema 测试 | P0 | 1 天 | |
| Chat 组件测试（chat-input, chat-message-item） | P1 | 2 天 | |
| Dashboard 页面测试（agents, files, projects, skills） | P2 | 2-3 天 | |
| `packages/desktop-core` IPC 测试 | P2 | 2-3 天 | |
| `packages/ui` 组件测试 | P2 | 1-2 天 | |

**验证标准**：
- 共享包与核心 composables 覆盖率 > 80%；页面测试不作覆盖率主要来源。
- 会话录制-回放在 CI（无 API key）中可重放并断言消息投影与 UI 关键状态。

### 1.3 Hygiene 工具链

**当前状态**：无死代码检测、无包发布正确性检查、无重复代码检测。

落点：作为 turbo script 接入现有任务图（`pnpm hygiene`），CI 中与 lint 并行，不另建流程。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 集成 knip（死代码/未用依赖检测） | P1 | 0.5 天 | |
| 集成 publint（package.json 发布正确性） | P1 | 0.5 天 | |
| 跨文件重复代码检测（如 jscpd） | P2 | 0.5 天 | |

### 1.4 前端监控

**当前状态**：无错误上报，无结构化日志。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 集成 Sentry（错误跟踪 + 性能监控） | P1 | 2-3 天 | |
| 添加前端错误边界组件 | P1 | 1 天 | |
| 结构化 console 日志（开发环境） | P2 | 1 天 | |

**实现要点**：

```typescript
// plugins/sentry.ts
import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  Sentry.init({
    dsn: useRuntimeConfig().public.sentryDsn,
    environment: useRuntimeConfig().public.environment,
    tracesSampleRate: 0.1,
  })
})
```

### 1.5 API 文档

**当前状态**：Swagger 已配置但无装饰器。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 给现有 controller 添加 `@ApiTags` / `@ApiOperation` 装饰器 | P1 | 1-2 天 | |
| 导出 OpenAPI spec 到 CI 校验 | P2 | 1 天 | |

### 阶段一验证清单

- [ ] CI 时间 < 5 分钟（以量测数据为准）
- [ ] 会话录制-回放在无 key 的 CI 中通过
- [ ] knip / publint 在 CI 中运行
- [ ] 共享包与核心 composables 覆盖率 > 80%
- [ ] Sentry 可接收前端错误
- [ ] Swagger 文档可读可用
- [ ] `pnpm verify:docs` 在 CI 中运行

---

## 阶段二：能力适配器 + 域模块 + 事件类型（3-6 个月）

**目标**：定义能力适配器接口、产品域模块骨架与会话事件词汇表，为可扩展性和事件溯源奠定类型与应用架构地基。

> 关键顺序决策：事件类型从阶段三提前到本阶段。状态源（事件日志）是后续所有架构的唯一锚点（OpenHands V0→V1 的重做代价即源于此）；类型定义成本低，先定词汇表，阶段三只做落地。

### 2.1 能力适配器接口

**当前状态**：业务逻辑集中在应用层，无明确的能力抽象。但仓库已有成熟的契约模式可复用——`packages/types/src/utils/ipc-channels.ts` 用 `IpcChannelMap` 派生 `DesktopAPI`，让 Electron 主进程与渲染进程共享类型。

**做法**：适配器接口沿用同一模式定义在 `packages/types/src/adapters/`，接口是唯一的耦合点；实现方与调用方都只 import `packages/types`，互不 import。实现侧不引入新机制——后端注册为 NestJS 原生 provider，前端通过 composable 工厂参数显式传入。

| 适配器 | 定义位置 | 预估工时 | 负责人 |
|--------|----------|----------|--------|
| **LLM 适配器** | `packages/types/src/adapters/llm.ts` | 2-3 天 | |
| **Storage 适配器** | `packages/types/src/adapters/storage.ts` | 1-2 天 | |
| **Auth 适配器** | `packages/types/src/adapters/auth.ts` | 1-2 天 | |
| **Shell 适配器** | `packages/types/src/adapters/shell.ts` | 2-3 天 | |

**LLM 适配器接口**：

```typescript
// packages/types/src/adapters/llm.ts

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface LLMChatParams {
  model: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
}

export interface LLMChatResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
  }
}

export interface LLMAdapter {
  chat(params: LLMChatParams): Promise<LLMChatResponse>
  stream?(params: LLMChatParams): AsyncGenerator<LLMChunk>
}
```

实现（如 DeepSeek/OpenAI 兼容适配器）注册为 NestJS provider 供后端消费，或由 composable 工厂注入前端调用方；两侧位置互不依赖。

### 2.2 依赖注入：用现有机制，不自研容器

**决策**：不实现自研 DI 容器，也不引入新框架。后端已有 NestJS 原生 DI，前端用 composable 参数显式注入；"换一个实现"通过替换注册项完成，这就是 2.1 接口存在的意义。若阶段四确认引入插件系统后需要更强的作用域隔离，再单独评估（届时优先看 Cordis 而非自研）。

### 2.3 会话事件类型定义（从阶段三提前）

**当前状态**：无事件词汇表，无持久化。前端 chat 类型目前散在 `app/components/chat/types.ts`，需升格到 `packages/types` 统一。

**设计约束**（学习 OpenHands 事件溯源的两条核心经验 + dsh 的一条不变量）：

1. **"模型可见即已记录"不变量**：凡抵达模型请求的内容，必须能从事件日志重建，并由运行时断言验证。这是回放/fork 可靠的基础。
2. **可投影为消息的事件与内部簿记事件分离**：`deriveMessages()` 只投影前者，内部事件（状态管理/控制流）不进入模型历史。
3. **turn/step 边界事件**：fork 的 boundary 定义在这些边界上；没有 turn/step 概念，"fork at boundary"无从定义。

```typescript
// packages/types/src/events/session.ts

/** 可投影为模型消息的事件（deriveMessages 只取这些） */
export type MessageEventType =
  | 'user_message'
  | 'assistant_message'
  | 'tool_call'
  | 'tool_result'
  | 'system_prompt'
  | 'context_injection'

/** 内部簿记事件：状态管理/控制流，不进入模型历史 */
export type BookkeepingEventType =
  | 'turn_start'
  | 'turn_end'
  | 'step_start'
  | 'step_end'
  | 'condensation'
  | 'agent_created'
  | 'agent_status_changed'

export type SessionEventType = MessageEventType | BookkeepingEventType

export interface SessionEvent {
  id: string
  type: SessionEventType
  timestamp: number
  sessionId: string
  agentId?: string
  payload: unknown
}

export interface EventFilter {
  sessionId?: string
  agentId?: string
  type?: SessionEventType
  from?: number
  to?: number
  limit?: number
}

export interface SessionEventLog {
  append(event: SessionEvent): Promise<void>
  query(filter: EventFilter): Promise<SessionEvent[]>
  deriveMessages(): Promise<Message[]>  // 只投影 MessageEventType，Message 升格自现有 chat types
  fork(boundaryEventId: string): Promise<SessionEventLog>  // boundary 为 turn/step 边界事件 id
}
```

本阶段只交付类型定义与单元测试，持久化在阶段三落地。

### 2.4 配置分层：扩展现有 .env 级联

**当前状态**：dotenv-cli 级联（`pnpm dev` → `.env` + `.env.development`；`build`/`start` → `.env` + `.env.production`）+ `env.validation.ts` zod 校验已就位。

**差距**：无个人/部署覆盖层，前端无法运行时读取，校验仅后端有。

**做法**：不引入 YAML 或新的配置系统，在现有级联上补两层——

```text
.env                     # 基础层（已存在）
.env.development         # 环境层（已存在）
.env.production          # 环境层（已存在）
.env.local               # 个人/部署覆盖层（新增，git-ignore，级联最后加载）
```

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| dotenv-cli 级联加入 `.env.local` 覆盖层 + 文档说明优先级 | P0 | 1 天 | |
| zod env schema 提到 `packages/shared`，前后端共用（后端 `env.validation.ts`、前端 `packages/shared/env.ts` 收敛为一份） | P1 | 2-3 天 | |
| 前端配置走 Nuxt `runtimeConfig` 打通（构建时不内联、启动时可覆盖） | P1 | 2-3 天 | |
| 开发环境配置热更新（仅前端 runtimeConfig 部分） | P2 | 3-5 天 | |

### 2.5 文档系统升级：并入 verify-docs 门禁

**当前状态**：`scripts/verify-docs.cjs` 已覆盖链接/字数/双语 hash。缺口：文档内 ts 代码块不受编译检查（类型 drift 无法发现）、无生成式目录、无 cookbook。

**做法**：全部作为 `verify-docs.cjs` 的新增检查项或 `scripts/` 下的配套脚本，同一条 `pnpm verify:docs` 门禁命令，不引入独立工具链。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| verify-docs 新增 ts 代码块检查：提取文档内 `ts` 块做编译，引用的类型必须从 `packages/types` 真实导出 | P0 | 1 周 | |
| 生成式目录（`scripts/` 生成脚本 + verify-docs freshness 检查）：config-catalog / event 映射 / module-graph | P1 | 1-2 周 | |
| cookbook（`docs/cookbook/`）：『如何加一个包/工具/LLM 适配器』分步 how-to，带编号验证步骤 | P1 | 1 周 | |

**说明**：ts 代码块检查对 2.1 适配器接口文档尤为关键——接口文档与源码 drift 会直接误导实现方。生成式目录中的 event 映射依赖阶段三事件系统，可后置到阶段三收尾。

### 2.6 产品域模块骨架

**当前状态**：后端仅有 auth/health/throttle 基础设施模块，五个产品域（见"应用架构目标态"）无落点；前端无域级组织。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 后端五个域模块骨架（controller/service/entities 空实现 + 路由注册，遵守域间只走 service 注入） | P0 | 1 周 | |
| `packages/types` 补 HTTP API 契约类型（对齐 error-envelope 与响应信封，复用 IPC 契约派生模式） | P0 | 3-5 天 | |
| 前端 feature 目录约定 + agents 域 typed client 与 composables 样板 | P1 | 1 周 | |
| 其余四域 typed client 与 composables 迁移 | P2 | 1-2 周 | |

**说明**：骨架先行（空实现 + 契约），业务功能随后填充；这为阶段三 sessions 域事件系统和阶段四适配器插件化给出确定落点，避免业务代码长完再搬家。

### 阶段二验证清单

- [ ] 四个能力适配器接口就位，实现方与调用方互不 import
- [ ] 五个产品域的 server 模块骨架与 HTTP API 契约类型就位
- [ ] agents 域完成前端 feature 化样板（typed client + composables，页面只做组装）
- [ ] 会话事件词汇表定稿：消息事件与簿记事件分离，含 turn/step 边界
- [ ] 文档 ts 代码块受 `pnpm verify:docs` 门禁保护
- [ ] `.env.local` 覆盖层生效，env schema 前后端一份
- [ ] cookbook 至少覆盖『加一个 LLM 适配器』路径

---

## 阶段三：事件驱动落地（6-9 个月）

**目标**：落地事件持久化、查询、回放与审计。类型已在阶段二定稿，本阶段只做实现；会话事件系统的宿主是 sessions 域模块（见"应用架构目标态"）。

### 3.1 事件日志持久化

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现事件日志存储（前端 IndexedDB / 后端 PostgreSQL，append-only；后端走现有 MikroORM + migrations 工作流） | P0 | 2 周 | |
| 实现事件查询和过滤 | P1 | 1 周 | |
| 运行时不变量断言：模型可见输入可从日志重建 | P0 | 3-5 天 | |

### 3.2 事件回放与 fork

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现事件回放和恢复 | P1 | 1 周 | |
| 实现会话 fork（boundary 为 turn/step 边界事件） | P1 | 1 周 | |

### 3.3 事件总线

**做法**：先做最小类型化事件总线（`on`/`emit`，事件名与 payload 类型来自 2.3 的词汇表，定义在 `packages/shared`）。分发模式（waterfall / parallel / bail 等）**不预先实现**——等出现真实的多元消费者场景再按需增补，避免为不存在的需求建机制。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 类型化事件总线（on/emit + 词汇表类型约束） | P0 | 3-5 天 | |
| 给现有中间件/拦截器添加事件钩子 | P1 | 1 周 | |
| 分发模式（按需，出现真实消费者才做） | 按需 | — | |

```typescript
// packages/shared/src/events/bus.ts — 最小实现

export interface SessionEventBus {
  on<T extends SessionEventType>(type: T, handler: (e: SessionEvent & { type: T }) => void): () => void
  emit(event: SessionEvent): void
}
```

### 3.4 审计日志

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现操作审计日志（后端，复用事件日志存储与信封规范） | P1 | 1 周 | |
| 实现审计日志查询 UI | P2 | 1-2 周 | |

### 3.5 生成式事件目录

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 从源码生成 event producer-consumer 映射表 + verify-docs freshness 检查（依赖 2.5 的生成器框架） | P2 | 3-5 天 | |

### 阶段三验证清单

- [ ] 会话事件可持久化（append-only）
- [ ] 运行时断言通过：模型可见输入可从日志重建
- [ ] 支持事件回放和恢复
- [ ] 支持会话 fork（turn/step 边界）
- [ ] 审计日志完整
- [ ] event producer-consumer 映射表由生成器产出并受门禁保护

---

## 阶段四：能力适配器插件化（9-12 个月）

**目标**：能力适配器可热插拔，工具/技能包有标准分发格式。

**明确非目标**：Web UI、agent loop 不插件化。Growth OS 是类 Coze 桌面产品，不是 CLI agent 框架；扩展面收窄为：能力适配器可替换 + 第三方工具/技能包可分发。

### 4.1 适配器插件接口

插件机制是 2.1 适配器接口的运行时化：插件 = 带元数据的适配器包，加载器负责注册/撤销，本质仍是对接现有机制（NestJS provider 注册 / composable 注入），不引入新容器。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 设计适配器插件接口规范 | P0 | 1 周 | |
| 定义插件元数据格式（package.json `growthos` 字段） | P0 | 2-3 天 | |
| 实现插件加载器 | P1 | 2-3 周 | |

**插件接口设计**：

```typescript
// packages/types/src/plugin.ts

export interface PluginMetadata {
  id: string
  name: string
  version: string
  description: string
  author?: string
  adapters: AdapterRef[]  // 声明实现哪些适配器接口
}

export interface AdapterRef {
  type: 'llm' | 'storage' | 'auth' | 'shell' | 'tool'
  interface: string  // 对应 packages/types/src/adapters/ 的接口名
  version: string
}

export interface Plugin {
  metadata: PluginMetadata
  activate(context: PluginContext): Promise<void>
  deactivate(): Promise<void>
}

export interface PluginContext {
  registerAdapter(type: AdapterRef['type'], impl: unknown): void
  getAdapter<T>(type: AdapterRef['type']): T
  on(event: string, handler: EventHandler): () => void
  getConfig<T>(): T
}
```

### 4.2 插件生命周期与分发

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现插件 install / mount / running / unmount 生命周期 | P0 | 2-3 周 | |
| 实现插件作用域隔离 | P1 | 2 周 | |
| 工具/技能包分发格式（基于 `growthos` 元数据字段，npm 包即可安装） | P1 | 1 周 | |
| 实现插件配置热更新 | P2 | 1-2 周 | |

**生命周期设计**：

```
Install → Mount → Running → Unmount → Uninstall
   ↓         ↓        ↓         ↓          ↓
 校验      注册     活跃      清理       移除
 依赖      适配器   运行      适配器     缓存
 配置      事件     监听      事件       配置
```

### 4.3 迁移现有模块

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 将 LLM 适配器改造为插件 | P1 | 1 周 | |
| 将 Storage 适配器改造为插件 | P1 | 1 周 | |
| 将 Auth 适配器改造为插件 | P2 | 1 周 | |

### 阶段四验证清单

- [ ] 能力适配器插件可动态加载/卸载，注册随卸载自动撤销
- [ ] 插件作用域隔离
- [ ] 工具/技能包有可安装的分发格式
- [ ] 现有功能保持稳定（以阶段一的录制-回放回归）

---

## 依赖关系图

```
阶段一（工程化）
  ├── 1.1 CI 优化（turbo 任务图并行）
  ├── 1.2 测试分层（含会话录制-回放）
  ├── 1.3 Hygiene 工具链
  ├── 1.4 前端监控
  └── 1.5 API 文档
        ↓
阶段二（能力适配器 + 域模块 + 类型地基）
  ├── 2.1 能力适配器接口（复用 IPC 契约派生模式）
  ├── 2.2 DI 决策（用 NestJS/composable 现有机制）
  ├── 2.3 会话事件类型定义 ←———— 提前，供 1.2 借用格式
  ├── 2.4 配置分层（扩展 .env 级联）
  ├── 2.5 文档系统升级（并入 verify-docs 门禁）
  └── 2.6 产品域模块骨架（领域地图落地）
        ↓
阶段三（事件驱动落地）
  ├── 3.1 事件日志持久化（含不变量断言）
  ├── 3.2 事件回放与 fork
  ├── 3.3 事件总线（最小实现，分发模式按需）
  ├── 3.4 审计日志
  └── 3.5 生成式事件目录（依赖 2.5 的生成器框架）
        ↓
阶段四（适配器插件化）
  ├── 4.1 适配器插件接口
  ├── 4.2 生命周期与分发格式
  └── 4.3 迁移现有适配器
```

---

## 资源估算

| 阶段 | 人力 | 技能要求 | 总工时 |
|------|------|----------|--------|
| 阶段一 | 1-2 人 | 前端/后端/DevOps | 4-5 周 |
| 阶段二 | 1-2 人 | 架构设计/TypeScript | 6-8 周 |
| 阶段三 | 2-3 人 | 事件驱动/分布式系统 | 5-7 周 |
| 阶段四 | 2-3 人 | 插件系统/架构设计 | 6-8 周 |

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 重构导致功能回归 | 高 | 高 | 渐进式重构；会话录制-回放作为回归防线 |
| 团队学习成本 | 中 | 中 | 每项改进都落在现有机制上（无新体系要学），cookbook 分步指南 |
| 依赖兼容性 | 低 | 高 | 锁定依赖版本，逐步升级 |
| 性能下降 | 中 | 中 | 性能测试，基准对比 |
| 过度设计 | 中 | 高 | 阶段四明确非目标；自研容器已砍；分发模式按需；配置不换体系 |

**兼容性立场**：首个对外 tagged release 之前优先正确的地基——允许内部 breaking change，决策记录 Agent Note，不写兼容 shim。发布首个对外版本后再收紧。

---

## 差距收敛路径

| 能力 | 当前 | 阶段一后 | 阶段二后 | 阶段三后 | 阶段四后 |
|------|------|----------|----------|----------|----------|
| 可扩展性 | 🔴 大 | 🔴 大 | 🟡 中 | 🟡 中 | 🟢 小 |
| 可观测性 | 🔴 大 | 🟡 中 | 🟡 中 | 🟢 小 | 🟢 小 |
| 配置管理 | 🟡 中 | 🟡 中 | 🟢 小（.env 级联补全） | 🟢 小 | 🟢 小 |
| 状态管理 | 🟡 中 | 🟡 中 | 🟢 小 | 🟢 小 | 🟢 小 |
| 领域组织 | 🔴 大（核心域无落点） | 🔴 大 | 🟢 小（域骨架 + 契约） | 🟢 小 | 🟢 小 |
| 文档规范 | 🟡 中 | 🟡 中 | 🟢 小 | 🟢 小 | 🟢 小 |
| 类型安全 | 🟢 小 | 🟢 小 | 🟢 小 | 🟢 小 | 🟢 小 |

---

## 参考资料

- [DeepSeek Harness 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)
- [DeepSeek Harness 文档标准](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/AGENTS.md)
- [Cordis 插件框架](https://github.com/cordiverse/cordis)
- [OpenHands Software Agent SDK 论文 (arXiv 2511.03690)](https://arxiv.org/abs/2511.03690)
- [Growth OS 架构地图](../docs/architecture.md)
- [Growth OS AGENTS.md](../AGENTS.md)
