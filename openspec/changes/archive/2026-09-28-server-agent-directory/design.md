# Design: Agent 目录服务端化（server-agent-directory）

## Context

前端目录现状：`useAgents.ts` 以 localStorage 持久化（键 `growth-os-agents`）、前端生成 slug（`agent-` + uuid 前 8 位）、`createAgent` 为同步函数、内置 seed「小花颜」为前端常量 `BUILT_IN_AGENTS`（永不写盘）。服务端无 agent 模块；既有同构参照为 `modules/audit/`（defineEntity 实体 + controller/service/module 三件套 + `MikroOrmModule.forFeature([Entity], 'default')`）。跨端契约参照为 `packages/types/src/api/audit.ts`（zod schema + `HttpEndpoint` map）。请求通道 `apiFetch` 已自动携带 Bearer JWT 并解包 `{ data: T }` 信封。骨架决策与结构惯例见 [.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md](../../../../.agents/notes/implemented/architecture/2026-09-25-ai-architecture-skeleton-and-diagram-suite.md)（其中 agent-config 原排期 H2，本变更按用户决策提前，先立数据面）。

## Goals / Non-Goals

**Goals:**

- agents 表落库（user_id 隔离 + RLS），创建/列表/删除三端点，契约进 `@growth-os/types`
- 内置默认 Agent「小花颜」seed 进库，目录完全以服务端为唯一数据源（消灭前端常量双源）
- 前端目录切换为纯服务端数据，创建 async 化带错误呈现，删除带确认与路由处理

**Non-Goals:**

- 不做更新端点（后续刀）
- 不做 agent 模型配置绑定（provider/model 字段随 AI 链路刀加）
- 不做技能体系（skills 仍为字符串数组占位）
- 不做删除后的对话历史级联清理策略（对话链路落地前会话仅存前端内存，见 Decisions 6）

## Decisions

1. **模块结构：`modules/agents/` 平级单层，与 audit 完全同构。** 备选「modules/ai/ 聚合容器」已被骨架落盘否决（「别的模块都没有」即否决理由，见骨架 note 教训段）。
2. **slug 服务端生成：`agent-` + `node:crypto` randomUUID 前 8 位，冲突重生成。** 理由：name 为中文无法派生 slug；前端生成会把唯一性仲裁留在不可信侧。备选 nanoid 依赖（拒：零依赖已可行）、数据库 serial slug（拒：暴露序数、URL 不友好）。沿用前端既有格式，URL 观感不变。
3. **契约单一真相源迁入 `packages/types/src/api/agents.ts`**：`agentSchema`（slug/name/emotion/color?/description?/skills?/isDefault boolean）+ `createAgentSchema`（无 slug/isDefault）+ `AgentApiMap`（POST/GET/DELETE）。前端 `app/types/agents.ts` 删除，消费方统一改从 `@growth-os/types` 导入（不做 re-export 兼容垫层）。emotion 校验为非空字符串而非枚举——表情策展清单是前端资产且随上游演进，服务端锁枚举会制造双端清单漂移。
4. **实体与迁移**：`AgentEntity`（tableName `agents`；`id` text 主键应用层 UUID；`userId` text 列 `user_id` **nullable**（默认 Agent 无归属）；`slug` text unique；`name`/`emotion` text not null；`color`/`description` text null；`skills` jsonb null；`isDefault` boolean 列 `is_default` not null 默认 false；`createdAt` datetime）。迁移 up：建表 + `slug` unique + `user_id` 索引 + RLS enable + policy `user_id = auth.uid() or is_default = true` + **seed 行**（固定 UUID、slug `xiaohuayan`、name「小花颜」、emotion `02`、is_default true）；down：drop table。Supabase 侧 `rls_auto_enable` 事件触发器只 enable 不建 policy，policy 须显式写入迁移；服务端经连接串访问不受 policy 影响。
5. **默认 Agent = 共享单行，不做每用户克隆。** 备选「新用户首次访问时惰性克隆一份」被拒：克隆时机散、防篡改逻辑复杂、每用户一行徒增存储；共享行 + policy 放行 `is_default` 最简，且「内置不可变」语义由 API 层保证（无 update 端点 + DELETE 拒绝 403）。
6. **前端数据源**：`initAgents`/`persist`/`BUILT_IN_AGENTS` 整体移除，目录 = `loadAgents()` 结果（GET /agents，默认行在前由服务端保证）；加载失败/未登录回退为**空目录 + 空态提示**（不再前端造数据）——`getDefaultAgent` 改为可空语义，调用点（tasks/new 发送、[id].vue 兜底）做空目录防御（禁用发送 / 空态）。模块加载不再隐式初始化，改为登录会话就绪处显式触发，并保留显式 reset 供测试隔离（对齐 tests/isolation 规则）。`createAgent` 变 async（POST）；新增 `removeAgent(slug)`（DELETE，成功后从目录移除，并清理该 slug 的前端内存聊天会话 `useAgentChat`）。
7. **删除交互**：侧边栏条目 hover 显现删除图标 → 二次确认弹窗（daisyUI dialog）→ 确认后 DELETE → 成功移除条目；当前路由即该 agent 页时 `navigateTo` 默认 agent 开场页。默认条目不渲染入口（前端）+ 服务端 403 双保险。删除确认弹窗复用项目既有 modal 模式，不新增全局状态。
8. **404 判定时序**：目录列表未加载完成时 `getAgent` 返回 undefined 会造成自建 agent 页瞬时 404。`useAgents` 增加 `loaded` 标志，agent 页 404 分支仅在 `loaded === true` 后判定。

## Risks / Trade-offs

- [目录加载窗口内 agent 页误判 404] → `loaded` 标志门控 404 分支（Decisions 8）
- [加载失败回退空目录使新任务页不可发送] → 这是诚实降级（后端不可用时对话本就不可用）；空态提示可见，`getDefaultAgent` 可空化防止抛错崩页
- [RLS policy 误伤服务端写入] → 服务端连接串角色不受 RLS 约束；迁移后跑一次服务端 CRUD 冒烟验证
- [seed 行固定 UUID 与未来环境复制冲突] → seed 仅一行且迁移幂等（up 只跑一次）；down 直接 drop 表无残留
- [契约迁移触面较大（前端多处 import type）] → 全局搜索 `types/agents'` 引用一次改齐，typecheck 兜底

## Migration Plan

实施顺序 = tasks 顺序：契约 → server 模块 → 迁移（`pnpm mikro-orm:migration:create` + 手工补 RLS policy 与 seed + `migration:up`）→ 前端切换 → 测试。回滚：`migration:down` drop 表，前端回退由 git revert 覆盖；agents 表在本变更前不存在，无数据迁移负担。

## Open Questions

（无——全部决策已在 Decisions 落定。）
