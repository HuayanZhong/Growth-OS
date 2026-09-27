# Design: agent-chat-dock-transition

## Context

现状：`pages/dashboard/agents/[id].vue` 与 `pages/dashboard/tasks/new.vue` 是 hero 态（居中问候语 + `TaskComposer`），发送仅 toast 占位；聊天视图不存在。`useGsapTransition`（[2026-09-13 note](../../../../.agents/notes/implemented/feature/2026-09-13-use-gsap-transition.md)）已收拢 GSAP 接线（`enter/exit/normalizeTarget/kill`、模块级 CSSPlugin 注册、scope 卸载自动回收）；SFC 分层契约（[2026-09-27 note](../../../../.agents/notes/implemented/refactor/2026-09-27-sfc-layering.md)）要求状态/业务逻辑进 composables、SFC 只做视图组装。dashboard 布局 `<main>` 为 `overflow-auto`，路由切换有内容区滑入过渡。desktop 内 gsap 3.15.0 自带 Flip 插件（已验证 `node_modules/gsap/Flip.js` 存在）。

约束：动画规则（`.trae/rules/frontend/styles/animation.md`）——transform/opacity only、真实 DOM 目标、手动 GSAP、完成清理残留；测试规则——不触真实服务、test → typecheck → lint。

## Goals / Non-Goals

**Goals:**

- hero → chat 的停靠过渡：TaskComposer 的 DOM 节点全程存活，视觉上「从中间滑到底部」（FLIP）
- 会话状态收拢在 `useAgentChat` composable，按 slug 内存缓存，驱动双态与重进直达
- 新任务页发送 → 首条消息交接进 agent 会话
- Flip 插件注册并入 `useGsapTransition` 的模块级注册

**Non-Goals:**

- 不接后端、不产生真实 agent 回复、不做流式
- 不做会话持久化（刷新/重启即失）
- 不做「开启新对话」重置入口、消息流回到底部悬浮按钮、消息富文本/markdown 渲染
- 新任务页自身不做停靠变形（保持 hero，发送即跳转）

## Decisions

### D1: 页内双态，不建新路由

Agent 页依据会话存在性渲染 hero 或 chat（Coze 同型：会话即 agent 页本体）。备选：独立 chat 路由——需跨路由传 DOM 连续性，FLIP 无法跨页面挂载存活，且多一层参数管道；否决。

### D2: GSAP Flip 承担停靠位移

发送时序（与动画规则的「离场 → 翻转状态 → 入场」形态一致）：

```
1. const state = Flip.getState(composerWrapEl)     // 记录居中位置/尺寸
2. gsap timeline: 问候语 exit（opacity→0, y:-16, ~0.25s）
3. onComplete (async):
   phase = 'chat' + 追加首条用户消息 → await nextTick()
4. Flip.from(state, { target: composerWrapEl, duration: ~0.45,
   ease: 'power3.inOut', onComplete: clearProps })  // 位移 + 宽度过渡
   并行: useGsapTransition.enter(listEl, {opacity:0}→{opacity:1})
```

备选：手写 FLIP（同效果多代码）、交叉淡入（丢失用户明确要的位移感）。Flip 的 `target` 固定为**包裹 TaskComposer 的普通 div**（始终挂载、template ref 直取），规避规则第 4 条的 `$el` fragment 锚点问题——不把动画目标指向组件实例。

### D3: 问候语与 phase 分离控制

`phase: 'hero' | 'chat'` 控制消息流/停靠类与根容器类；问候语由独立的 `greetingGone` 标志控制 `v-if`，保证淡出动画期间节点存活（顺序：先淡出、后卸载）。若淡出与 FLIP 并行，chat 布局类会让问候语瞬间跳位（`justify-center` 消失），故串行。

### D4: `useAgentChat` 状态模型

```ts
// app/types/chat.ts —— 纯类型
type ChatRole = 'user' | 'agent'
interface ChatMessage { id: string; role: ChatRole; kind: 'text' | 'typing'; text: string }
```

```ts
// app/composables/useAgentChat.ts —— 模块级单例（reactive Map<slug, { messages }>）
hasSession(slug)            // 驱动 agent 页初始 phase
sendMessage(slug, text)     // 追加用户消息 + agent typing 占位（无网络）
consumePending(slug)        // 新任务页交接：命中则立即 sendMessage 并返回文本
```

会话存在性 = `messages.length > 0`，hero/chat 判定不引入额外状态。id 用自增/`crypto.randomUUID()`，仅前端内存。typing 占位渲染为三点脉冲气泡（简单 CSS 动画，符合规则第 2 条：简单效果走 CSS）。

### D5: 新任务页交接走 composable 暂存，不走 URL

`tasks/new.vue` 的 `onSend(text)` → `stagePending(slug, text)` + `navigateTo()`；agent 页 setup 内 `consumePending(slug)` 命中则初始 phase 即 `'chat'`（无 hero 闪现、无 FLIP，视觉由 dashboard 布局既有路由过渡承担）。备选：query param 传草稿——URL 污染 + 编码问题；history state——Nuxt 下取用繁琐。否决。

### D6: chat 态滚动与宽度

chat 态根容器 `flex h-full flex-col overflow-hidden`（页面不滚），消息流 `flex-1 overflow-y-auto` + 新消息后 `nextTick` 滚到底；停靠容器全宽 + 水平边距（抄 Coze），Flip 自动过渡宽度差。`<main>` 保持 `overflow-auto` 不动（内容 h-full 不溢出，无双重滚动）。

### D7: Flip 注册并入 useGsapTransition

`gsap.registerPlugin(Flip)` 加在 `useGsapTransition.ts` 模块加载处（与 CSSPlugin 并列，幂等），页面只 import 不注册——延续 frontend-motion 的集中注册契约（本次为 ADDED 需求）。

## Risks / Trade-offs

- [Flip 过渡期间消息列表插入导致布局跳动] → 列表与 composer 在 FLIP 开始后才挂载/显现，必要时启用 Flip `absolute: true` 隔离（实现时目测决定）
- [快速连发/过渡中重复触发] → `phase` 判定守卫（仅 hero→chat 走动画），在飞 tween 由 `gsap.killTweensOf` / scope 回收兜底
- [过渡中切页卸载] → `useGsapTransition` 的 `onScopeDispose` 自动 kill + Flip tween 一并纳入回收；动画规则验证清单（残留、滚动条抖动）作为实现完成标准
- [会话仅内存、重启即失] → 有意为之（静态态定位）；后续任务执行接入时换数据源，composable 接口不变
- [既有测试受影响] → `test/nuxt/agent-page.test.ts`（断言 toast/单态的部分需按双态改写）；`task-composer.test.ts` 原则上不受影响（组件接口未变），跑一遍确认

## Migration Plan

纯前端增量，无数据/接口迁移。随 change 一次性上线；回滚即还原三个前端文件 + composable/组件（无持久化残留）。

## Open Questions

无——范围决策已在探索阶段与用户对齐（新任务页交接语义、假回复占位、撑满宽度、内存缓存）。
