# Proposal: Agent 目录服务端化（server-agent-directory）

Status: proposed

## Why

Agent 目录目前是纯前端本地实现（localStorage 持久化 + 前端生成 slug），无服务端模型。`agents/create-agent-modal` 主 spec 的 Purpose 已预埋「服务端模型落地后整体迁移」；且 AI 对话链路（chat/graph）的 `runChat` 输入就是 agent 配置——agent 实体不落库，后续 AI 域没有可靠的配置来源。用户拍板先立 agent 数据面，再做对话链路。同时补齐创建之外最基础的**删除**能力，并要求内置默认 Agent「小花颜」同样由服务端提供（不做前端常量双源）。

## What Changes

- `apps/server` 新增 `modules/agents/`（平级单层模块，与 audit 同构）：`AgentEntity`（agents 表）、`POST /api/v1/agents`（创建）、`GET /api/v1/agents`（目录列表）、`DELETE /api/v1/agents/:slug`（删除）
- MikroORM 迁移：agents 建表 + Supabase RLS policy + **内置默认 Agent seed 行**（slug `xiaohuayan`、`is_default = true`，全局共享一行，所有用户可见）
- `packages/types` 新增 `src/api/agents.ts` 跨端契约（`createAgentSchema` + `agentSchema`，zod 单一真相源）；**slug 改为服务端生成**（node:crypto randomUUID 短片段，零新依赖）
- 前端 `useAgents` / `useCreateAgentForm` 切换 API 数据源（`apiFetch` 通道）：目录完全来自服务端（含默认 Agent），**localStorage 持久化与 `BUILT_IN_AGENTS` 前端常量移除**；创建变 async，失败时表单呈现错误且不跳转
- 前端删除入口：侧边栏 AGENTS 分组条目提供删除操作（确认弹窗二次确认；默认 Agent 不提供入口），删除成功后目录即时移除并处理当前路由
- `AgentEntry` / `CreateAgentInput` 类型从 `apps/desktop/app/types/agents.ts` 迁入跨端契约（翻转该文件「仅前端局部、不进跨端契约」的既有约定，见 design）

## Capabilities

### New Capabilities

- `agents/agent-directory`: 服务端 Agent 目录——创建/列表/删除端点、用户隔离（JWT sub → user_id + RLS）、slug 服务端生成与唯一性、内置默认 Agent 的 seed 与保护（不可删除）

### Modified Capabilities

- `agents/create-agent-modal`: 「目录持久化」需求从本地存储改为服务端持久化（内置默认 Agent 也来自服务端 seed；加载失败回退为空目录 + 空态提示，不再前端造数据）；「创建 Agent」需求的 slug 生成方从前端改为服务端；新增「删除 Agent」需求（入口、确认、目录一致性、路由处理）与创建失败（API 错误）场景

## Impact

- `apps/server`: 新增 `modules/agents/`（entity/controller/service/module）+ `src/infra/database/migrations/` 一个迁移（建表 + RLS + 索引 + seed 行）
- `packages/types`: 新增 `src/api/agents.ts` + barrel 导出；无依赖变更
- `apps/desktop`: `useAgents.ts`（数据源切换 + async createAgent + removeAgent）、`useCreateAgentForm.ts`（async submit + 错误态）、`types/agents.ts`（迁入契约后删除）、`app-sidebar.vue`（删除入口）、`CreateAgentModal.vue`（错误呈现）、`[id].vue`（404 门控）；相关单测/Nuxt 测试同步改造
- 不触碰 harness assets（`.trae/`、`.agents/`、`AGENTS.md`）
- 无新依赖；Supabase 侧新增一张业务表（服务端经连接串访问，RLS policy 对齐骨架决策「业务表带 user_id 隔离」，默认行经 policy 放行对所有登录用户可见）
