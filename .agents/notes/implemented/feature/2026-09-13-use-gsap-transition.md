# Agent Note: useGsapTransition composable（GSAP 接线收拢）

Status: implemented

五个组件/页面重复的 GSAP 接线（CSSPlugin 注册、`$el` fragment 归一化、fromTo 入场、killTweensOf 先行的离场 Promise）收拢为 `apps/desktop/app/composables/useGsapTransition.ts`（API `{ enter, exit, normalizeTarget, kill }`，`getCurrentScope` + `onScopeDispose` 自动回收实例内 tween）；login.vue、ToastContainer.vue、chat-message-item.vue 全量迁移，auth/index.vue 与 dashboard.vue 保留手写 timeline 编排但复用注册与 normalizeTarget。graphify 图谱中 gsap 的直接消费方从 5 个组件收敛为 2 个（两处刻意保留的 timeline 编排），gsap 节点度数 6 → 4，新增 useGsapTransition 枢纽。完整决策与备选方案见 [openspec/changes/archive/2026-09-13-add-use-gsap-transition](../../../../openspec/changes/archive/2026-09-13-add-use-gsap-transition/proposal.md)（proposal/design/specs/tasks）。
