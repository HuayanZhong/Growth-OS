# Agent 会话停靠视图与输入框位移动画

## Why

Agent 开场页发送目前只有 toast 占位：没有会话视图，输入框也不会像 Coze 那样在发送后停靠到底部。对标 Coze 桌面体验是本项目既定方向，聊天流 + 底部输入区是 agent 页面的核心形态，静态布局先行才能让后续任务执行接入时有落点。

## What Changes

- Agent 开场页（`/dashboard/agents/:id`）新增 chat 态：上方消息流（每条消息带头像 + 名称身份行，agent 加「AI」徽章；agent 侧打字指示占位），下方停靠的 TaskComposer（宽度撑满内容区，左右留边距）
- chat 态补齐 Coze 顶部结构：固定顶栏（agent 名 + 在线状态，点击名字弹出 Agent 信息卡：大头像 / 名称 / 在线 / 已开启技能标签）、消息流顶部「对话由AI生成」声明与日期分割线（消息带 `createdAt` 时间戳，M-DD 格式）
- hero → chat 过渡动画：在开场页发送时，输入框以 GSAP Flip 从居中位置平滑位移停靠到底部，问候语淡出、消息流淡入（并行编排）
- 新增 `useAgentChat` composable：按 agent slug 的内存会话缓存（应用会话内保留，重启即失）；已建会话的 agent 从侧边栏重进直接呈现 chat 态
- 新任务页（`/dashboard/tasks/new`）发送行为改为：暂存首条消息 → 路由跳转到所选 agent 页 → 该页直接以 chat 态挂载并发出首条消息（跨路由不做 FLIP，由布局既有路由过渡接管）
- Agent 回复为纯前端静态占位（打字指示气泡），不接后端；`TaskComposer` 仅新增 `showAgentSelector` 开关（chat 态隐藏 agent 选择垫层）

## Capabilities

### New Capabilities

- `agent-chat`: agent 会话视图的静态行为——hero/chat 双态布局、发送驱动的输入框停靠过渡、按 slug 的会话内存缓存、新任务页到 agent 会话的首条消息交接

### Modified Capabilities

- `frontend-motion`: motion composable 模块级集中注册 GSAP Flip 插件（幂等），组件页面继续不自行注册动画插件

## Impact

- 层级：仅 `apps/desktop`（前端）；不触 `apps/server`、`packages/*`；不触 harness 资产（`.trae/`、`.agents/`、`AGENTS.md` 无变化）
- 代码：
  - 新增 `app/composables/useAgentChat.ts`、`app/components/ChatMessageList.vue`
  - 修改 `app/pages/dashboard/agents/[id].vue`（双态 + 动画编排）、`app/pages/dashboard/tasks/new.vue`（发送改为暂存 + 跳转）、`app/components/TaskComposer.vue`（`showAgentSelector` 开关 + 宽度约束外移）、`app/composables/useGsapTransition.ts`（仅模块级 Flip 注册一行）
- 测试：新增 `test/unit/use-agent-chat.test.ts`；受双态影响的既有测试同步调整
- 依赖：gsap ^3.15.0（catalog 既有，Flip 已内置），无新增依赖
