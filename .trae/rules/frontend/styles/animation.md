---
alwaysApply: false
description: Animation rule (Vue 3 + GSAP): use manual GSAP + timeline, not Vue Transition out-in (Nuxt 4 bug); targets must be real DOM; perspective on parent, never transformPerspective; animate transform only; clean up. Use for switch/entrance animations.
---

# Animation Spec (GSAP)

**When to use**: page/component switch animations, entrance effects, elastic transitions, etc.

**Key points**:

1. Dependency: GSAP's version goes through the pnpm catalog (in the `frontend` directory); packages use `"gsap": "catalog:frontend"`, never a pinned version.
2. Simple transitions (hover, single-element fades) prefer CSS transitions; GSAP is for elastic/multi-element/sequenced animations.
3. Component switching (login↔register, etc.) forbids Vue `<Transition mode="out-in">` + JS hooks + child component composition: under Nuxt 4 the new component either never mounts after leave completes or is removed right after mounting. Use **manual GSAP instead**: old component exit animation (await completion) → flip `v-if/v-else` → new component entrance after `nextTick`. For complex sequences orchestrate with `gsap.timeline()` (`to` exit + switch content in `onComplete` + `fromTo` entrance), avoiding hand-rolled `new Promise` + `async/await` stacks.
4. **Animation targets must be real DOM elements**: under Nuxt 4, a conditionally-rendered component's (v-if/v-else) `$el` may be a fragment anchor (Text/comment node); gsap throws `Missing plugin?` on it and writes no styles (symptom: content switches instantly, no transition). Normalize first — return the element when nodeType matches, otherwise `querySelector` the target class from the parent (e.g. `.hero-content`).
5. **3D flips (rotationY/rotationX) fix perspective on the parent container** (Tailwind `[perspective:1200px]` or CSS); never use `transformPerspective` as a tween property: GSAP tweens perspective from a near-zero value (~1px) to the target, causing extreme near-far distortion (stretched elements) and scrollbar flicker (overflow jitter).
6. Animation targets use element references/refs, not global string selectors (prevents hitting elements outside the component and scope leaks).
7. Animate only transform (`x/y/scale/rotation`) and `opacity`, never layout properties like `top/left/width/height`; stagger multi-element timing.
8. Clean up when done: `gsap.kill()` or `clearProps` in `onComplete`/`onUnmounted` to prevent transform residue (residue makes later switches "look animated-less" or drift positions).
9. Switch experience: entrance animations run `fromTo` from the target state, applying the start value on the first frame to avoid flicker.

**Example** (3D flip switch login/register):

```vue
<script setup lang="ts">
import { nextTick, ref } from "vue";
import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";

// Explicitly register CSSPlugin: Vite pre-bundling tree-shakes gsap's auto-registration (sideEffects:false),
// without it CSS properties like rotationY/opacity are all ignored ("Missing plugin") and animations don't run
gsap.registerPlugin(CSSPlugin);

const mode = ref<"a" | "b">("a");
const aRef = ref<HTMLElement>();
const bRef = ref<HTMLElement>();

// Normalize animation target: a conditionally-rendered component's $el may be a fragment anchor (Text/comment node), grab the real element
function formRoot(el: unknown): HTMLElement | null {
  if (!el) return null;
  return (el as Node).nodeType === Node.ELEMENT_NODE
    ? (el as HTMLElement)
    : ((el as Node).parentElement?.querySelector(".card") ?? null);
}

// 3D half-page flip: old form flips out to -90° → switch content → new form flips in from +90°.
// Perspective is fixed on the parent (e.g. [perspective:1200px] on .hero), the flip only animates rotationY —
// using transformPerspective as an animated property tweens perspective from near-zero to target: extreme distortion + scrollbar flicker
function switchMode(next: "a" | "b") {
  if (mode.value === next) return;
  const curEl = formRoot(mode.value === "a" ? aRef.value : bRef.value);
  gsap
    .timeline({
      onComplete: async () => {
        mode.value = next;
        await nextTick();
        const nextEl = formRoot(next === "a" ? aRef.value : bRef.value);
        if (nextEl) {
          gsap.fromTo(
            nextEl,
            { rotationY: 90 },
            { rotationY: 0, duration: 0.5, ease: "back.out(1.5)", clearProps: "transform" },
          );
        }
      },
    })
    .to(curEl, { rotationY: -90, duration: 0.4, ease: "power2.in" });
}
</script>

<template>
  <div class="hero min-h-screen perspective-distant">
    <CompA v-if="mode === 'a'" ref="aRef" />
    <CompB v-else ref="bRef" />
  </div>
</template>
```

**Verification**:

1. Browser-tested two-way switching: content swaps correctly, animations run, no transform/opacity residue after finishing (check inline transform is empty, computed style is `transform: none`).
2. Repeated switching (≥5 times) has no freezes or lost elements; compare `documentElement.scrollWidth/Height` against the viewport — no scrollbar flicker (overflow jitter) during the whole animation.
3. When an animation "looks like it didn't run" (content switches instantly), check in order: ① is the target real DOM (`$el` may be a Text/comment node); ② is `gsap.plugins.css` registered; ③ sample intermediate frames (inline transform at t≈100/300/700ms) to confirm the tween is writing styles.
4. `pnpm --filter <app> typecheck` passes.
