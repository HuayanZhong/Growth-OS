# Growth OS 架构迭代方案

> 基于 DeepSeek Harness（dsh）与 OpenHands 的架构对比分析制定的分阶段演进计划。
> 目标：补齐工程基础，引入经过验证的架构设计理念，缩小与行业标杆的差距。

---

## 背景

Growth OS 是一个类 Coze 的 AI Agent 桌面平台，采用 Nuxt 4 + NestJS + Electron + Supabase 技术栈。通过与 DeepSeek Harness（基于 Cordis 插件系统的开源 Agent 框架）和 OpenHands（V1 Software Agent SDK）对比，得出以下差距评估：

| 维度 | Growth OS 现状 | DeepSeek Harness / OpenHands | 差距等级 |
|------|----------------|------------------------------|----------|
| 可扩展性 | 模块化单体，需改代码 | 一切皆插件，热插拔 / 模块化 SDK | 🔴 大 |
| 可观测性 | 基础日志 | 事件溯源，完整审计 | 🔴 大 |
| 配置管理 | .env 文件 | Profile/Bundle/Patch 四层 | 🔴 大 |
| 状态管理 | 组合式函数单例 | 服务容器 + 依赖注入 | 🟡 中 |
| 文档规范 | 链接/字数/双语 hash 机器检查 | 缺 doc-typecheck、生成式目录、cookbook | 🟡 中 |
| 类型安全 | 全链路 IPC 类型派生 | 类型化服务/事件 | ✅ 持平 |

**两条总体策略**：

1. 保持类型安全与双语校验优势，渐进补齐短板，避免大爆炸重构。
2. **Foundation over blast radius**（借自 dsh 的 pre-release 立场）：首个对外 tagged release 之前，优先正确的地基而非兼容性——允许内部 breaking change，用 Agent Note 记录决策，不写兼容 shim，不背兼容债。

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

**后端**（沿用现有 NestJS 分层）：`modules/<domain>/{controller,service,entities}`；controller 只做协议转换（zod 校验 + envelope），业务在 service，持久化在 entities/repository。域间调用走 service 显式注入，禁止跨域直接查表。

**前端**：传输与业务分离——

- `useApi` 保持传输层职责（token 注入、错误信封解包），不膨胀业务方法
- 每个域一组 typed client（`app/features/<domain>/api.ts`），入参/返回类型来自 `packages/types` 的 HTTP API 契约（复用现有 IPC 契约派生模式）
- 页面（`pages/`）只做路由组装与布局，域逻辑在 feature 目录的 composables
- 状态：Session 域以事件日志为唯一事实源（阶段三落地后 UI 从事件投影）；其余域用域级 composables，事件系统就位后再评估是否引入 Pinia

### 与各阶段的衔接

- 阶段二 2.6 落地域模块骨架（空实现 + HTTP API 契约类型 + agents 域前端样板）
- 阶段三的会话事件系统宿主是 sessions 域
- 阶段四"迁移现有模块"即迁移各域的 Provider

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

**当前状态**：核心 composables 有测试，但缺会话级回归防护。

**分层策略**（参考 dsh）：unit（共享包高覆盖）+ e2e（无凭证自动跳过）+ **会话录制-回放**（录制真实会话，CI 中无 key 重放）。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 会话录制-回放测试（snapshot replay，事件格式可提前借用阶段二定义） | P0 | 1 周 | |
| `packages/shared` 测试（env.ts, normalize.ts） | P0 | 1 天 | |
| `packages/types` zod schema 测试 | P0 | 1 天 | |
| Chat 组件测试（chat-input, chat-message-item） | P1 | 2 天 | |
| Dashboard 页面测试（agents, files, projects, skills） | P2 | 2-3 天 | |
| `packages/desktop-core` IPC 测试 | P2 | 2-3 天 | |
| `packages/ui` 组件测试 | P2 | 1-2 天 | |

**验证标准**：
- 共享包与核心 composables 覆盖率 > 80%；页面测试不作覆盖率主要来源。
- 会话 snapshot replay 在 CI（无 API key）中可重放并断言消息投影与 UI 关键状态。

### 1.3 Hygiene 工具链

**当前状态**：无死代码检测、无包发布正确性检查、无重复代码检测。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 集成 knip（死代码/未用依赖检测）进 CI | P1 | 0.5 天 | |
| 集成 publint（package.json 发布正确性） | P1 | 0.5 天 | |
| 跨文件重复代码检测（如 jscpd）进 CI | P2 | 0.5 天 | |

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
- [ ] 会话 snapshot replay 在无 key 的 CI 中通过
- [ ] knip / publint 在 CI 中运行
- [ ] 共享包与核心 composables 覆盖率 > 80%
- [ ] Sentry 可接收前端错误
- [ ] Swagger 文档可读可用
- [ ] `pnpm verify:docs` 在 CI 中运行

---

## 阶段二：能力接缝 + 域模块 + 事件类型（3-6 个月）

**目标**：定义核心能力接缝、产品域模块骨架与会话事件词汇表，为可扩展性和事件溯源奠定类型与应用架构地基。

> 关键顺序决策：事件类型从阶段三提前到本阶段。状态源（事件日志）是后续所有架构的唯一锚点（OpenHands V0→V1 的重做代价即源于此）；类型定义成本低，先定词汇表，阶段三只做落地。

### 2.1 能力接缝（三角色设计）

**当前状态**：业务逻辑集中在应用层，无明确的能力抽象。

采用 dsh 的 **seam 三角色**模型：**Service Definition**（声明接口）/ **Service Provider**（实现）/ **Consumer**（消费方）。三者的分离是"换一个 Provider 就改变整个产品"的原因；只有 Adapter 接口而实现与消费耦合在一起，得不到可替换性。

| 接缝 | 定义位置 | 预估工时 | 负责人 |
|------|----------|----------|--------|
| **LLM 接缝** | `packages/types/src/seams/llm.ts` | 2-3 天 | |
| **Storage 接缝** | `packages/types/src/seams/storage.ts` | 1-2 天 | |
| **Auth 接缝** | `packages/types/src/seams/auth.ts` | 1-2 天 | |
| **Shell 接缝** | `packages/types/src/seams/shell.ts` | 2-3 天 | |

**约束**：Provider 与 Consumer 互不 import，各自只依赖 `packages/types` 中的 Service Definition。

**LLM 接缝设计**：

```typescript
// packages/types/src/seams/llm.ts — Service Definition

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

Provider（如 DeepSeek/OpenAI 兼容适配器）与 Consumer（agent loop、chat UI）分别实现/消费该接口，位置互不依赖。

### 2.2 服务容器决策：不自研

**决策**：不实现自研 DI 容器。理由：register/resolve 式容器是 Cordis 的低配重复，却拿不到 Cordis 的真正价值（可逆副作用、类型化事件、作用域隔离）；对单人项目是纯复杂度。

| 选项 | 判断 |
|------|------|
| a) 接缝接口 + 显式依赖注入参数（默认） | 现阶段足够，零额外抽象 |
| b) 直接采用 Cordis（MIT，可 vendor 源码） | 阶段四若确认引入插件系统再评估 |

### 2.3 会话事件类型定义（从阶段三提前）

**当前状态**：无事件词汇表，无持久化。

**设计约束**（对照 dsh 与 OpenHands V1）：

1. **"模型可见即已记录"不变量**：凡抵达模型请求的内容，必须能从事件日志重建，并由运行时断言验证。这是回放/fork 可靠的基础。
2. **LLM 可转换事件与内部事件分离**（OpenHands `LLMConvertibleEvent` vs bookkeeping event）：`deriveMessages()` 只投影前者。
3. **turn/step 边界事件**：fork 的 boundary 定义在这些边界上；没有 turn/step 概念，"fork at boundary"无从定义。

```typescript
// packages/types/src/events/session.ts

/** 可投影为模型消息的事件（deriveMessages 只取这些） */
export type LLMConvertibleEventType =
  | 'user_message'
  | 'assistant_message'
  | 'tool_call'
  | 'tool_result'
  | 'system_prompt'
  | 'context_injection'

/** 内部簿记事件：状态管理/控制流，不进入模型历史 */
export type InternalEventType =
  | 'turn_start'
  | 'turn_end'
  | 'step_start'
  | 'step_end'
  | 'request_header'
  | 'condensation'
  | 'agent_created'
  | 'agent_status_changed'

export type SessionEventType = LLMConvertibleEventType | InternalEventType

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
  deriveMessages(): Promise<Message[]>  // 只投影 LLMConvertible 事件
  fork(boundary: string): Promise<SessionEventLog>  // boundary 为 turn/step 边界事件 id
}
```

本阶段只交付类型定义与单元测试，持久化在阶段三落地。

### 2.4 配置分层管理

**当前状态**：`.env` 文件 + dotenv-cli 级联。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 设计分层配置结构（base / profile / override） | P0 | 2-3 天 | |
| 实现配置解析器 | P1 | 1 周 | |
| 支持运行时配置热更新（仅开发环境） | P2 | 1 周 | |

**配置分层设计**：

```yaml
# config/base.yml - 基础配置
server:
  port: 4000
  timeout: 30000

# config/profiles/development.yml - 开发环境
server:
  debug: true
  db:
    logging: true

# config/profiles/production.yml - 生产环境
server:
  debug: false
  db:
    logging: false

# growthos.patch.yml - 用户覆盖
server:
  port: 4001
```

### 2.5 文档系统升级

**当前状态**：verify:docs 已覆盖链接/字数/双语 hash，但对照 dsh 的 docs/AGENTS.md 存在三类缺口。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| doc-typecheck：文档内 `ts` 代码块编译检查 + `type-equiv` manifest（防止文档类型与源码 drift） | P0 | 1 周 | |
| 生成式目录：从源码生成 config-catalog / event producer-consumer 映射 / module-graph，带 freshness gate | P1 | 1-2 周 | |
| cookbook 层：『如何加一个包/工具/LLM 适配器』分步 how-to（带编号验证步骤） | P1 | 1 周 | |

**说明**：doc-typecheck 对本阶段尤为关键——接缝接口文档里的类型声明若与源码 drift，将直接误导扩展方。生成式目录依赖阶段三的事件系统完成后才能生成 event 映射，可后置到阶段三收尾。

### 2.6 产品域模块骨架

**当前状态**：后端仅有 auth/health/throttle 基础设施模块，五个产品域（见"应用架构目标态"）无落点；前端无域级组织。

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 后端五个域模块骨架（controller/service/entities 空实现 + 路由注册，遵守域间只走 service 注入） | P0 | 1 周 | |
| `packages/types` 补 HTTP API 契约类型（对齐 error-envelope 与响应信封，复用 IPC 契约派生模式） | P0 | 3-5 天 | |
| 前端 feature 目录约定 + agents 域 typed client 与 composables 样板 | P1 | 1 周 | |
| 其余四域 typed client 与 composables 迁移 | P2 | 1-2 周 | |

**说明**：骨架先行（空实现 + 契约），业务功能随后填充；这为阶段三 sessions 域事件系统和阶段四 Provider 迁移给出确定落点，避免业务代码长完再搬家。

### 阶段二验证清单

- [ ] 四个能力接缝的三角色类型定义完成，Provider/Consumer 互不 import
- [ ] 五个产品域的 server 模块骨架与 HTTP API 契约类型就位
- [ ] agents 域完成前端 feature 化样板（typed client + composables，页面只做组装）
- [ ] SessionEventMap 定稿：LLMConvertible 与内部事件分离，含 turn/step 边界
- [ ] 文档 ts 代码块受 doc-typecheck 门禁保护
- [ ] 配置支持分层覆盖
- [ ] cookbook 至少覆盖『加一个 LLM 适配器』路径

---

## 阶段三：事件驱动落地（6-9 个月）

**目标**：落地事件持久化、查询、回放与审计。类型已在阶段二定稿，本阶段只做实现；会话事件系统的宿主是 sessions 域模块（见"应用架构目标态"）。

### 3.1 事件日志持久化

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现事件日志存储（前端 IndexedDB / 后端 PostgreSQL，append-only） | P0 | 2 周 | |
| 实现事件查询和过滤 | P1 | 1 周 | |
| 运行时不变量断言：模型可见输入可从日志重建 | P0 | 3-5 天 | |

### 3.2 事件回放与 fork

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现事件回放和恢复 | P1 | 1 周 | |
| 实现会话 fork（boundary 为 turn/step 边界事件） | P1 | 1 周 | |

### 3.3 事件中间件

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现 waterfall 事件分发器 | P0 | 1-2 周 | |
| 实现 parallel / serial / bail 分发模式 | P1 | 1 周 | |
| 给现有中间件添加事件钩子 | P2 | 1-2 周 | |

**事件分发模式设计**：

```typescript
// packages/shared/src/events/dispatcher.ts

export type EventMode = 'emit' | 'waterfall' | 'parallel' | 'serial' | 'bail'

export interface EventDispatcher {
  on(event: string, handler: EventHandler, options?: { prepend?: boolean }): () => void
  emit(event: string, ...args: unknown[]): void
  async waterfall(event: string, ...args: unknown[]): Promise<unknown>
  async parallel(event: string, ...args: unknown[]): Promise<void>
  async serial(event: string, ...args: unknown[]): Promise<unknown>
  async bail(event: string, ...args: unknown[]): Promise<unknown>
}
```

### 3.4 审计日志

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现操作审计日志（后端） | P1 | 1 周 | |
| 实现审计日志查询 UI | P2 | 1-2 周 | |

### 3.5 生成式事件目录

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 从源码生成 event producer-consumer 映射表 + freshness gate | P2 | 3-5 天 | |

### 阶段三验证清单

- [ ] 会话事件可持久化（append-only）
- [ ] 运行时断言通过：模型可见输入可从日志重建
- [ ] 支持事件回放和恢复
- [ ] 支持会话 fork（turn/step 边界）
- [ ] 审计日志完整
- [ ] event producer-consumer 映射表由生成器产出并受 freshness gate 保护

---

## 阶段四：能力适配器插件化（9-12 个月）

**目标**：能力适配器可热插拔，工具/技能包有标准分发格式。

**明确非目标**：Web UI、agent loop 不插件化。Growth OS 是类 Coze 桌面产品，不是 CLI agent 框架；"一切皆插件"对本产品是过度设计。扩展面收窄为：能力适配器可替换 + 第三方工具/技能包可分发。

### 4.1 适配器插件接口

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
  capabilities: Capability[]  // 声明提供哪些接缝的 Provider
}

export interface Capability {
  type: 'llm' | 'storage' | 'auth' | 'shell' | 'tool'
  seam: string  // 对应 packages/types/src/seams/ 的接口名
  version: string
}

export interface Plugin {
  metadata: PluginMetadata
  activate(context: PluginContext): Promise<void>
  deactivate(): Promise<void>
}

export interface PluginContext {
  registerProvider(seam: string, provider: unknown): void
  getProvider<T>(seam: string): T
  on(event: string, handler: EventHandler): () => void
  getConfig<T>(): T
}
```

### 4.2 插件生命周期与分发

| 任务 | 优先级 | 预估工时 | 负责人 |
|------|--------|----------|--------|
| 实现插件 install / mount / running / unmount 生命周期 | P0 | 2-3 周 | |
| 实现插件作用域隔离 | P1 | 2 周 | |
| 工具/技能包分发格式（类 dsh-plugin topic，便于生态发现） | P1 | 1 周 | |
| 实现插件配置热更新 | P2 | 1-2 周 | |

**生命周期设计**：

```
Install → Mount → Running → Unmount → Uninstall
   ↓         ↓        ↓         ↓          ↓
 校验      注册     活跃      清理       移除
 依赖      Provider 运行      Provider   缓存
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
- [ ] 现有功能保持稳定（以阶段一的 snapshot replay 回归）

---

## 依赖关系图

```
阶段一（工程化）
  ├── 1.1 CI 优化（turbo 任务图并行）
  ├── 1.2 测试分层（含会话 snapshot replay）
  ├── 1.3 Hygiene 工具链
  ├── 1.4 前端监控
  └── 1.5 API 文档
        ↓
阶段二（能力接缝 + 域模块 + 类型地基）
  ├── 2.1 能力接缝三角色
  ├── 2.2 服务容器决策（不自研）
  ├── 2.3 会话事件类型定义 ←———— 提前，供 1.2 借用格式
  ├── 2.4 配置分层
  ├── 2.5 文档系统升级（doc-typecheck / cookbook）
  └── 2.6 产品域模块骨架（领域地图落地）
        ↓
阶段三（事件驱动落地）
  ├── 3.1 事件日志持久化（含不变量断言）
  ├── 3.2 事件回放与 fork
  ├── 3.3 事件中间件
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
| 阶段二 | 1-2 人 | 架构设计/TypeScript | 7-9 周 |
| 阶段三 | 2-3 人 | 事件驱动/分布式系统 | 6-8 周 |
| 阶段四 | 2-3 人 | 插件系统/架构设计 | 6-8 周 |

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 重构导致功能回归 | 高 | 高 | 渐进式重构；会话 snapshot replay 作为回归防线 |
| 团队学习成本 | 中 | 中 | 文档培训，cookbook 分步指南，逐步引入 |
| 依赖兼容性 | 低 | 高 | 锁定依赖版本，逐步升级 |
| 性能下降 | 中 | 中 | 性能测试，基准对比 |
| 过度设计 | 中 | 高 | 阶段四明确非目标（UI/loop 不插件化）；自研容器已砍掉 |

**兼容性立场**：首个对外 tagged release 之前遵循 foundation over blast radius——允许内部 breaking change，决策记录 Agent Note，不写兼容 shim。发布首个对外版本后再收紧。

---

## 差距收敛路径

| 能力 | 当前 | 阶段一后 | 阶段二后 | 阶段三后 | 阶段四后 |
|------|------|----------|----------|----------|----------|
| 可扩展性 | 🔴 大 | 🔴 大 | 🟡 中 | 🟡 中 | 🟢 小 |
| 可观测性 | 🔴 大 | 🟡 中 | 🟡 中 | 🟢 小 | 🟢 小 |
| 配置管理 | 🔴 大 | 🔴 大 | 🟡 中 | 🟡 中 | 🟢 小 |
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
