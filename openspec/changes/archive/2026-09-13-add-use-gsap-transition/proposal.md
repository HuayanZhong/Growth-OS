# Proposal: add-use-gsap-transition

## Why

The knowledge graph flags `gsap` as the highest-betweenness bridge in the UI (centrality 0.104): five independent components each repeat the same GSAP wiring — CSSPlugin registration boilerplate, `fromTo` entrance with first-frame start values, `clearProps` residue cleanup, fragment-anchor `$el` normalization, and kill-on-unmount. Every one of these is a mandated pattern from the animation rule (`.trae/rules/frontend/styles/animation.md`), and every copy is a chance to forget one (the residue/cleanup bugs the rule warns about come from exactly this repetition).

## What Changes

- Add `useGsapTransition()` composable in `apps/desktop/app/composables/` that centralizes: one-time CSSPlugin registration, entrance animation (`fromTo` with first-frame start values + default `clearProps`), exit animation (kills in-flight tweens first, resolves on completion), animation-target normalization (v-if fragment anchor → real element, optional fallback selector), and scope-dispose cleanup of tweens created by the composable instance.
- Migrate five components onto it, removing their local GSAP boilerplate: `components/auth/login.vue`, `pages/auth/index.vue`, `components/ToastContainer.vue`, `components/chat/chat-message-item.vue`, `layouts/dashboard.vue`.
- Add unit tests for the composable (`test/nuxt/use-gsap-transition.test.ts`).

Non-goals: no change to the animation rule itself; no fix for ToastContainer's pre-existing layout-property animation (height/margin/padding — recorded deviation, preserved verbatim through the migration); no promotion of the composable into `@growth-os/ui`; timeline orchestration in auth/index.vue and dashboard.vue stays hand-written per the animation rule.

## Capabilities

### New Capabilities

- `frontend-motion` — GSAP motion helpers: centralized plugin registration, entrance/exit animation API with residue cleanup, target normalization, and lifecycle-safe disposal.

### Modified Capabilities

(none — no existing spec covers animations)

## Impact

- `apps/desktop/app/composables/useGsapTransition.ts` (new)
- Five components listed above (boilerplate removal only; animation parameters preserved)
- `apps/desktop/test/nuxt/use-gsap-transition.test.ts` (new)
- No dependency changes (gsap stays catalog-managed); no server/package changes; visual behavior must remain identical (same durations, easings, targets).
