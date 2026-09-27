# Proposal: add-agent-create-modal

## Why

侧边栏 AGENTS 分组的「新建」按钮目前是无行为的空壳，Agent 目录又是硬编码静态数组（仅内置小花颜），用户无法扩展自己的 Agent。对标 Coze 的「创建 Bot」流程补齐这一入口，同时把 Agent 目录从静态登记升级为可响应的前端状态——这是静态设计阶段（后端后置）的必要铺垫。

## What Changes

- 新增「创建 Agent」弹窗（布局 A）：左侧动态小球实时预览 + 右侧名称/描述表单 + 底部表情网格选择，视觉语言与 TaskComposer/退出登录弹窗一致（daisyUI modal + 语义令牌）。
- Agent 目录升级：`AgentEntry` 增加 `emotion`（表情 ID）与 `description`（可选）字段；静态数组改造为 composable 响应式 store，新建 Agent 持久化到 localStorage（键 `growth-os-agents`），非敏感数据不使用 secureStorage。
- 形象数据化：侧边栏、Agent 开场页、TaskComposer 下拉中硬编码的 `emotion="02"` 全部改为读 Agent 数据。
- 创建成功后路由切换到 `/dashboard/agents/<新 slug>`（延续「切 Agent 即切路由」的既有心智）。
- slug 由 `agent-` + Web Crypto `crypto.randomUUID()` 截取生成，用户不感知 URL 命名；不引入新依赖。

## Capabilities

### New Capabilities

- `agents/create-agent-modal`: 创建 Agent 弹窗的表单行为、表情形象选择、目录扩展与持久化、创建后导航；以及 Agent 目录响应式化后各消费点（侧边栏/开场页/输入组件下拉）的一致性要求。

### Modified Capabilities

（无既有 spec，跳过）

## Impact

- **apps/desktop**（唯一受影响层，纯前端）：
  - 改造 `app/utils/agents.ts`、新增 `app/composables/useAgents.ts`（响应式目录 + localStorage 持久化）
  - 新增 `app/components/agents/CreateAgentModal.vue`；修改 `app/components/app-sidebar.vue`（按钮接入 + 头像读数据）、`app/components/TaskComposer.vue`（下拉头像读数据 + 目录改走响应式）、`app/pages/dashboard/agents/[id].vue`（头像读数据）
  - 只读复用 `public/emotion-ball/`（零改动，许可约束见 Agent Note `2026-09-27-emotion-ball-agent-avatar.md`）
  - 测试：新增 store 单测与弹窗组件测试，更新受影响的既有测试
- **apps/server / packages/**：无改动（无新依赖、无跨层契约变化）
- **Harness assets**：不触碰 `.trae/`、`AGENTS.md`；按文档规则在 `.agents/notes/` 交付 thin pointer Note（OpenSpec 流程要求）
- **风险边界**：默认 Agent 小花颜始终保持 `isDefault: true` 且不受新建/持久化逻辑影响；localStorage 损坏时静默回退内置目录
