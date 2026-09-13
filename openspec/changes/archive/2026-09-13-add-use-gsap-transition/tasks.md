# Tasks: add-use-gsap-transition

## 1. Composable

- [x] 1.1 Create `apps/desktop/app/composables/useGsapTransition.ts`: module-level idempotent CSSPlugin registration; API `{ enter, exit, normalizeTarget, kill }` per design D3; instance tween tracking with `onScopeDispose` auto-kill (D4); `exit` kills in-flight tweens first and returns a promise resolved on completion. Verify: `pnpm --filter desktop typecheck`
- [x] 1.2 Add `apps/desktop/test/nuxt/use-gsap-transition.test.ts` (mock `gsap` + `gsap/CSSPlugin` per design D6): registration called once on import; `enter` passes first-frame from-vars + default `clearProps` with caller override winning; `exit` calls `killTweensOf` before `gsap.to` and resolves on `onComplete`; `normalizeTarget` branches (element passthrough / fragment fallback selector / null); scope-dispose kills tracked tweens. Verify: `pnpm --filter desktop exec vitest run test/nuxt/use-gsap-transition.test.ts`

## 2. Component migration (animation params copied verbatim; verify each visually in `pnpm dev`)

- [x] 2.1 `components/auth/login.vue`: replace local CSSPlugin registration + `gsap.to` exit with `exit(rootEl.value, { opacity: 0, scale: 0.94, y: -14, duration: 0.3, ease: 'power2.in', onComplete: () => navigateTo('/dashboard/agents') })`. Verify: typecheck + dev-server login flow animates and navigates on completion
- [x] 2.2 `pages/auth/index.vue`: adopt module registration via composable import and `normalizeTarget(el, '.hero-content')` replacing local `formRoot`; keep the flip `gsap.timeline()` orchestration and switching lock as-is; standalone entrance `fromTo` may use `enter`. Verify: dev-server login↔register flip runs both directions ≥5× with no residue or scrollbar flicker (animation rule verification §2)
- [x] 2.3 `components/ToastContainer.vue`: drop local registration; entrance `fromTo` → `enter` (stagger delay preserved via vars); leave path keeps explicit layout-property vars exactly as today (no default clearProps reliance — design risk #2); `onUnmounted` cleanup → `kill()` over tracked elements. Verify: dev-server toasts slide in, collapse out on expire/click, no residue after unmount
- [x] 2.4 `components/chat/chat-message-item.vue`: drop local registration; role-based `fromTo` entrance → `enter` with same x/y split and clearProps. Verify: dev-server chat messages animate (user from right, AI from bottom) with no residue
- [x] 2.5 `layouts/dashboard.vue`: drop local registration; keep staggered `gsap.timeline()` entrance; normalize targets via `normalizeTarget` where `$el`-shaped values occur (asideEl comes from child-exposed ref — keep as-is). Verify: dev-server login→dashboard transition animates sidebar/content slide-in, `clearProps` onComplete preserved

## 3. Full verification

- [x] 3.1 Full suite: `pnpm test` → `pnpm typecheck` → `pnpm lint` all green (desktop component tests for the 5 migrated files still pass)
- [x] 3.2 `pnpm --filter desktop verify:build` (Electron production build smoke)
- [x] 3.3 Graphify graph refresh per AGENTS.md: `graphify update .` + `graphify export html` + `graphify export callflow-html`; confirm the gsap star-hub now centers on the composable (before/after node degree noted in the change note)
- [x] 3.4 Ship Agent Note (full note, non-OpenSpec-workflow change is actually planned via OpenSpec → thin pointer per contract) in `.agents/notes/` summarizing the extraction and the graph degree delta; `pnpm verify` green
