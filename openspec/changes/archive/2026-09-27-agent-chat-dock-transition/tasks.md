# Tasks: agent-chat-dock-transition

## 1. 类型与会话状态

- [x] 1.1 新建 `apps/desktop/app/types/chat.ts`：`ChatRole` / `ChatMessage`（`kind: 'text' | 'typing'`）纯类型，显式 `import type`、无运行时。验证：`pnpm --filter desktop typecheck`
- [x] 1.2 新建 `apps/desktop/app/composables/useAgentChat.ts`（模块级单例，reactive Map 按 slug 缓存；`hasSession` / `sendMessage`（追加用户消息 + agent typing 占位，无网络）/ `stagePending` / `consumePending`），配套 `apps/desktop/test/unit/use-agent-chat.test.ts`（覆盖：发送追加两条消息、slug 隔离、pending 命中消费与未命中丢弃、会话存在性判定）。验证：`pnpm --filter desktop exec vitest run test/unit/use-agent-chat.test.ts`
- [x] 1.3 `apps/desktop/app/composables/useGsapTransition.ts` 模块加载处并排追加 `gsap.registerPlugin(Flip)`（`import { Flip } from 'gsap/Flip'`），确认既有测试不回归。验证：`pnpm --filter desktop exec vitest run test/nuxt/use-gsap-transition.test.ts`

## 2. 聊天视图组件

- [x] 2.1 新建 `apps/desktop/app/components/ChatMessageList.vue`：props 传消息数组；滚动容器 `flex-1 overflow-y-auto`，用户/agent 气泡按 role 区分（agent 头像用 `EmotionBall`），`kind: 'typing'` 渲染三点脉冲气泡（CSS 动画）；watch 消息数变化 `nextTick` 滚动到底。配套轻量渲染测试 `apps/desktop/test/nuxt/chat-message-list.test.ts`（区分 role/kind 渲染）。验证：`pnpm --filter desktop exec vitest run test/nuxt/chat-message-list.test.ts`

## 3. Agent 页双态与停靠过渡

- [x] 3.1 改造 `apps/desktop/app/pages/dashboard/agents/[id].vue` 为双态：setup 内 `consumePending(slug)` 命中则初始 `phase = 'chat'` 并发出首条消息，否则按 `hasSession(slug)` 判定；chat 态根容器 `flex h-full flex-col overflow-hidden`、停靠容器全宽留边距，问候语由独立 `greetingGone` 控制 `v-if`（设计 D3）。验证：`pnpm --filter desktop typecheck`
- [x] 3.2 实现 FLIP 停靠过渡（设计 D2 时序）：`Flip.getState` → 问候语 exit → `onComplete` 翻转 phase + 追加消息 + `nextTick` → `Flip.from(composerWrapEl)`（clearProps 收尾）+ 消息流 enter（`useGsapTransition`）；仅 hero→chat 走动画的守卫。验证：typecheck + 3.3 测试
- [x] 3.3 更新 `apps/desktop/test/nuxt/agent-page.test.ts`：无会话进 hero 态、有会话进 chat 态、pending 直达 chat 态且首条消息已入列；移除旧 toast 占位断言。验证：`pnpm --filter desktop exec vitest run test/nuxt/agent-page.test.ts`
- [x] 3.4 浏览器手动验证（`pnpm dev`），按动画规则验证清单：hero 发送触发输入框滑落停靠、问候语淡出、消息流淡入；动画完成后内联 transform/opacity 无残留；连续发送/重复触发 ≥5 次无卡顿丢元素、无滚动条抖动；过渡中切页无报错。验证：人工核对清单 + `pnpm --filter desktop typecheck`

## 4. 新任务页交接

- [x] 4.1 改造 `apps/desktop/app/pages/dashboard/tasks/new.vue`：`onSend(text)` 改为 `stagePending(defaultAgent.slug, text)` + `navigateTo()` 跳对应 agent 页，移除 toast 占位（该页逻辑两行、纯 UI 壳，按覆盖规则不单测；pending 消费行为由 3.3 的 agent 页测试覆盖）。验证：`pnpm --filter desktop exec vitest run test/nuxt/task-composer.test.ts` 不回归 + 浏览器走通「新任务页发送 → 落在 agent chat 态且首条消息在列」

## 5. 收尾验证

- [ ] 5.1 全量校验顺序 test → typecheck → lint 全绿。验证：`pnpm --filter desktop test` ; `pnpm --filter desktop typecheck` ; `pnpm --filter desktop lint`
- [ ] 5.2 仓库门禁。验证：`pnpm verify`
- [ ] 5.3 按 notes 契约写 thin pointer Agent Note（`.agents/notes/implemented/feature/`，摘要 + 链接本 change）。验证：文件存在且链接指向 `openspec/changes/agent-chat-dock-transition/`
