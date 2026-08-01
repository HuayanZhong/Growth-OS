---
alwaysApply: false
description: 动画规则（Vue 3 + GSAP）：GSAP 经 pnpm catalog 引入；组件切换禁 Vue Transition out-in + JS hooks + 子组件组合（Nuxt 4 bug），改手动 GSAP + timeline 编排；动画目标须归一化真实 DOM（条件渲染组件 $el 是 fragment 锚点）；3D 翻转 perspective 固定父容器，禁 transformPerspective 动画属性；动 transform、结束清理。编写切换动画、入场动效时使用。
---

# 动画规范（GSAP）

**适用场景**：页面/组件切换动画、入场动效、弹性过渡等。

**要点**：

1. 依赖引入：GSAP 版本走 pnpm catalog（`frontend` 目录），包内用 `"gsap": "catalog:frontend"`，不写死版本。
2. 简单过渡（hover、单元素淡入淡出）优先 CSS transition；弹性/多元素/时序动画才用 GSAP。
3. 组件切换（登录↔注册等）禁用 Vue `<Transition mode="out-in">` + JS hooks + 子组件组合：Nuxt 4 下 leave 完成后新组件不插入或插入即被移除。改用**手动 GSAP**：旧组件退出动画（await 完成）→ 切 `v-if/v-else` → `nextTick` 后新组件入场。复杂时序用 `gsap.timeline()` 编排（`to` 退出 + `onComplete` 内切内容 + `fromTo` 入场），避免手动 `new Promise` + `async/await` 堆叠。
4. **动画目标必须是真实 DOM 元素**：Nuxt 4 下条件渲染组件（v-if/v-else）的 `$el` 可能是 fragment 锚点（Text/注释节点），gsap 对其做 CSS 动画报 `Missing plugin?` 且不写样式（表现：内容直接切换、无过渡）。需先归一化——nodeType 命中元素直接返回，否则从父容器 `querySelector` 目标类（如 `.hero-content`）。
5. **3D 翻转（rotationY/rotationX）的 perspective 固定挂父容器**（Tailwind `[perspective:1200px]` 或 CSS），严禁把 `transformPerspective` 当 tween 属性：GSAP 会从极小值（约 1px）过渡到目标值，近大远小极端变形（元素拉伸）+ 滚动条闪烁（overflow 抖动）。
6. 动画目标用元素引用/ref，不用全局字符串选择器（防止命中组件外元素与作用域泄漏）。
7. 只动画 transform（`x/y/scale/rotation`）与 `opacity`，不动画 `top/left/width/height` 等布局属性；多元素错峰用 `stagger`。
8. 动画结束清理：`onComplete`/`onUnmounted` 里 `gsap.kill()` 或 `clearProps`，防止 transform 残留（残留会导致后续切换"看似无动画"或位置漂移）。
9. 切换体验：进入动画从目标状态反向 `fromTo`，首帧即应用起始值，避免闪烁。

**示例**（3D 翻转切换登录/注册）：

```vue
<script setup lang="ts">
import { nextTick, ref } from "vue";
import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 的自动注册（sideEffects:false），
// 不注册则 rotationY/opacity 等 CSS 属性全部被忽略（"Missing plugin"），动画不生效
gsap.registerPlugin(CSSPlugin);

const mode = ref<"a" | "b">("a");
const aRef = ref<HTMLElement>();
const bRef = ref<HTMLElement>();

// 归一化动画目标：条件渲染组件的 $el 可能是 fragment 锚点（Text/注释节点），需取真实元素
function formRoot(el: unknown): HTMLElement | null {
  if (!el) return null;
  return (el as Node).nodeType === Node.ELEMENT_NODE
    ? (el as HTMLElement)
    : ((el as Node).parentElement?.querySelector(".card") ?? null);
}

// 3D 半程翻页：旧表单翻出 -90° → 切内容 → 新表单从 +90° 翻入。
// 透视固定在父容器（如 .hero 上 [perspective:1200px]），翻转只动 rotationY——
// 若把 transformPerspective 当动画属性，透视值会从极小过渡到目标，极端变形并触发滚动条闪烁。
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

**验证**：

1. 浏览器实测双向切换：内容正确替换、动画生效、结束后无 transform/opacity 残留（检查 inline transform 为空、computed style 为 `transform: none`）。
2. 重复切换多次（≥5 次）无卡死、无元素丢失；对比 `documentElement.scrollWidth/Height` 与视口，动画全程无滚动条闪烁（overflow 抖动）。
3. 动画"看似没生效"（内容直接切换）时按序排查：① 目标是否为真实 DOM（`$el` 可能是 Text/注释节点）；② `gsap.plugins.css` 是否注册；③ 采样中间帧（t≈100/300/700ms 的 inline transform）确认 tween 在写样式。
4. `pnpm --filter <app> typecheck` 通过。
