---
alwaysApply: false
description: 动画规则（Vue 3 + GSAP）：GSAP 经 pnpm catalog 引入；复杂过渡禁用手动 GSAP 而非 Vue Transition（Nuxt 4 下 out-in + JS hooks + 子组件组合有 bug）；动 transform、stagger 错峰、结束清理避免残留。编写切换动画、入场动效时使用。
---

# 动画规范（GSAP）

**适用场景**：页面/组件切换动画、入场动效、弹性过渡等。

**要点**：

1. 依赖引入：GSAP 版本走 pnpm catalog（`frontend` 目录），包内用 `"gsap": "catalog:frontend"`，不写死版本。
2. 简单过渡（hover、单元素淡入淡出）优先 CSS transition；弹性/多元素/时序动画才用 GSAP。
3. 组件切换（登录↔注册等）禁用 Vue `<Transition mode="out-in">` + JS hooks + 子组件组合：Nuxt 4 下 leave 完成后新组件不插入或插入即被移除。改用**手动 GSAP**：先对旧组件做退出动画（await 完成），再切 `v-if/v-else`，`nextTick` 后对新组件做入场动画。
4. 动画目标用元素引用/ref，不用全局字符串选择器（防止命中组件外元素与作用域泄漏）。
5. 只动画 transform（`x/y/scale/rotation`）与 `opacity`，不动画 `top/left/width/height` 等布局属性；多元素错峰用 `stagger`。
6. 动画结束清理：`onComplete`/`onUnmounted` 里 `gsap.kill()` 或 `clearProps`，防止 transform 残留（残留会导致后续切换"看似无动画"或位置漂移）。
7. 切换体验：进入动画从目标状态反向 `fromTo`，首帧即应用起始值，避免闪烁。

**示例**：

```vue
<script setup lang="ts">
import { nextTick, ref } from "vue";
import gsap from "gsap";

const mode = ref<"a" | "b">("a");
const aRef = ref<HTMLElement>();
const bRef = ref<HTMLElement>();

async function switchMode(next: "a" | "b") {
  if (mode.value === next) return;
  const cur = mode.value === "a" ? aRef.value : bRef.value;
  // 1. 旧组件先退出（await 动画完成）
  if (cur) {
    await new Promise<void>((resolve) => {
      gsap.to(cur, { opacity: 0, y: -16, duration: 0.18, ease: "power2.in", onComplete: resolve });
    });
  }
  // 2. 再切换内容
  mode.value = next;
  await nextTick();
  // 3. 新组件入场：整体淡入 + 子元素错峰上浮
  const nextEl = next === "a" ? aRef.value : bRef.value;
  if (nextEl) {
    gsap.fromTo(nextEl, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power1.out" });
    gsap.fromTo(
      Array.from(nextEl.children),
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.5)" },
    );
  }
}
</script>
```

**验证**：

1. 浏览器实测双向切换：内容正确替换、动画生效、结束后无 transform/opacity 残留（检查 computed style 为 `transform: none`、`opacity: 1`）。
2. 重复切换多次（≥5 次）无卡死、无元素丢失。
3. `pnpm --filter <app> typecheck` 通过。
