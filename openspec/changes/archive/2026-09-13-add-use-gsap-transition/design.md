# Design: add-use-gsap-transition

## Context

Five components repeat the animation rule's mandated GSAP patterns by hand (surveyed via codebase + graphify community analysis): CSSPlugin registration (5×), `fromTo` entrances with first-frame start values (4×), `clearProps` residue cleanup (4×), fragment-anchor `$el` normalization (2×, plus the rule's own example), tween-kill cleanup (2×). See proposal.md — Why.

## Goals / Non-Goals

**Goals**
- Single home for the animation rule's mechanical patterns: plugin registration, entrance/exit wrappers, target normalization, disposal.
- Byte-identical animation parameters preserved through migration (durations, easings, targets, stagger delays).
- Composable disappears from the "5+ duplicated wiring" smell: gsap star-hub collapses onto one module.

**Non-Goals**
- No API change to the animation rule; the rule stays the "why", the composable is the "how".
- No fix of ToastContainer's height/margin/padding exit animation (pre-existing rule deviation — preserved verbatim, flagged for a separate decision).
- No promotion into `@growth-os/ui` (see D1); no timeline orchestration API (D5).

## Decisions

- **D1 — Location: `apps/desktop/app/composables/useGsapTransition.ts`, not `@growth-os/ui`.**
  All existing composables (useToast, useAuth, …) are app-layer; ui package ships components + style tokens only, and no other app consumes UI composables today. Moving it to ui would be the first ui-composable consumer for zero current need. Alternative (ui package) rejected as speculative generality.

- **D2 — CSSPlugin registration at composable module scope, idempotent.**
  `gsap.registerPlugin(CSSPlugin)` runs once when the module is first imported (module-level side effect in the composable file), replacing the 5 per-component blocks including their duplicated explanation comments. `registerPlugin` is idempotent so HMR reloads are safe. Alternative (register inside `useGsapTransition()` call) rejected: same effect, more calls.

- **D3 — API surface: `useGsapTransition()` returns `{ enter, exit, normalizeTarget, kill }`.**
  - `enter(target, fromVars, toVars)`: wraps `gsap.fromTo` with defaults `{ clearProps: 'transform,opacity' }` merged into `toVars` (caller override wins via spread order). Returns the tween.
  - `exit(target, toVars)`: `gsap.killTweensOf(target)` first, then `gsap.to`, returns `Promise<void>` resolved in `onComplete` (caller's `onComplete` still invoked if provided — chained before resolve). Covers login.vue's navigate-on-complete and auth/index.vue's switching-lock unlock.
  - `normalizeTarget(el, fallbackSelector?)`: the rule's `formRoot` pattern — element node passes through; non-element nodes fall back to `parentElement.querySelector(fallbackSelector)`; returns `HTMLElement | null`. Callers pass null-safe targets as today.
  - `kill(target?)`: `gsap.killTweensOf(target)` for explicit cleanup (ToastContainer's unmount path).
  Alternatives considered: a directive (`v-motion`) — rejected (Vue directive API hides the awaitable-exit need); a full timeline builder — rejected (rule D3 mandates hand-orchestrated timelines; wrapping them adds indirection without removing duplication).

- **D4 — Disposal: track instance-created tweens, dispose via `onScopeDispose`.**
  The composable records tween references it creates; if called inside a setup context (`getCurrentScope()` non-null), `onScopeDispose` kills them all. Components keep the option of explicit `kill(target)` for targeted cleanup (ToastContainer). Alternative (no auto-disposal, explicit only) rejected: forgotten cleanup is the exact bug class this change exists to kill.

- **D5 — Timeline orchestration stays manual.**
  auth/index.vue's flip sequence (exit timeline → v-if flip → nextTick → entrance) and dashboard.vue's staggered timeline remain hand-written `gsap.timeline()` code, per the animation rule's explicit orchestration guidance. They adopt `normalizeTarget` + the module-level registration but keep their timelines. Wrapping timelines would move rule-mandated orchestration behind an abstraction without removing duplication.

- **D6 — Tests mock the gsap module.**
  `test/nuxt/use-gsap-transition.test.ts` (Nuxt runtime per test/structure.md) uses `vi.mock('gsap')` + `vi.mock('gsap/CSSPlugin')`: assertions cover registration-once, fromTo arg shape (first-frame vars + default clearProps + caller override), killTweensOf-before-exit, promise resolution on onComplete, normalization branches, and scope-dispose kill. Real-gsap DOM animation assertions are brittle in happy-dom; mock.md rule: never exercise real external behavior in unit tests. Migration correctness for the 5 components is verified by existing component tests + typecheck + the dev-server visual check in tasks.

## Risks / Trade-offs

- [Subtle param drift during migration changes animation feel] → each component's from/to/ease/duration values are copied verbatim; component tests + dev-server visual verification per component in tasks.
- [ToastContainer animates layout properties (rule deviation) — wrapper default `clearProps: 'transform,opacity'` would differ from today's behavior] → its exit call passes explicit vars exactly as today (no default clearProps reliance); deviation documented, untouched.
- [Module-scope side effect complicates tree-shaking] → gsap is a runtime dependency of the app bundle regardless; the side effect is one idempotent call on an already-loaded module.
- [auth/index.vue edge: `exit()` promise + timeline orchestration mix] → its flip keeps `gsap.timeline()`; only the standalone entrance fromTo and normalization adopt the composable, so no mixing hazard.

## Migration Plan

Single PR: composable + tests land, five components migrate in the same change (repo rule: cross-package/single-capability changes update every consumer together). Rollback = revert the commit; no data or API surface affected.

## Open Questions

(none blocking implementation)
