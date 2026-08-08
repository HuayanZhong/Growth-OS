<script setup lang="ts">
// Toast 容器：入场滑入 + 离场收缩动画（GSAP 手动编排，禁 Vue Transition）
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
import type { ToastType } from '~/composables/useToast'

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 自动注册（sideEffects:false），
// 不注册则 x/scale/opacity 等 CSS 属性被忽略，动画不生效（registerPlugin 幂等）
gsap.registerPlugin(CSSPlugin)

const { toasts, removeToast } = useToast()

// 显示层：useToast 队列 + 已标记离场但动画未结束的 toast。
// 模板只渲染 display——useToast 移除条目后仍保留在显示层播放离场动画，
// 动画结束才真正移除，自动 3s 到期与点击关闭都不再"瞬间消失"
interface DisplayToast {
  id: number
  message: string
  type: ToastType
  leaving?: boolean
}
const display = ref<DisplayToast[]>([])

// 每个 toast 的真实 DOM 元素（动画目标归一化）
const toastEls = ref<Record<number, HTMLElement | null>>({})
// 已播放入场的 id：watch 触发多次时避免重复动画
const entered = new Set<number>()

// 监听队列变化（增删都会改变 id 序列）：
// 新增 → 补入显示层 + 入场动画；消失（useToast 已移除）→ 标记离场 + 离场动画。
// 注意不能 watch(toasts) 本体：showToast 是原地 push，shallow watch 不触发（Vue 3 数组原地修改的坑）
watch(
  () => toasts.value.map((t) => t.id).join(','),
  async () => {
    const liveIds = new Set(toasts.value.map((t) => t.id))
    // 补入新增条目（useToast 队列是权威，显示层只增不减地跟随）
    for (const t of toasts.value) {
      if (!display.value.some((d) => d.id === t.id)) {
        display.value.push({ ...t })
      }
    }
    await nextTick()
    // 入场动画：按显示层位置轻微错开（stagger），批量弹出时逐条滑入，避免同时挤入
    display.value.forEach((d, i) => {
      const el = toastEls.value[d.id]
      if (el && !entered.has(d.id)) {
        entered.add(d.id)
        gsap.fromTo(
          el,
          { opacity: 0, x: 64, scale: 0.9 },
          { opacity: 1, x: 0, scale: 1, duration: 0.45, ease: 'power3.out', delay: i * 0.08 },
        )
      }
    })
    // 离场动画：useToast 已移除但显示层仍保留的条目
    for (const d of display.value) {
      if (!liveIds.has(d.id) && !d.leaving) {
        d.leaving = true
        startLeave(d)
      }
    }
  },
  { immediate: true },
)

// 离场动画：收缩 + 淡出 + 右移，动画结束才从显示层移除（DOM 随之消失）
function startLeave(d: DisplayToast) {
  const el = toastEls.value[d.id]
  if (!el) {
    display.value = display.value.filter((x) => x.id !== d.id)
    return
  }
  // 动画中途重复触发：先终止进行中的 tween，避免从半途重新缩放
  gsap.killTweensOf(el)
  gsap.to(el, {
    opacity: 0,
    x: 64,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      display.value = display.value.filter((x) => x.id !== d.id)
    },
  })
}

// 点击关闭：移除队列条目，离场动画由 watch 统一接管（与自动移除同路径）
function dismiss(t: DisplayToast) {
  removeToast(t.id)
}

// 组件卸载时清理所有进行中的动画
onUnmounted(() => {
  gsap.killTweensOf(Object.values(toastEls.value))
})

// daisyUI alert 语义色映射
const alertClass: Record<ToastType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}
</script>

<template>
  <!-- daisyUI toast：固定右上角堆叠，点击关闭（离场动画后移除） -->
  <div class="toast toast-top toast-end z-100">
    <div
      v-for="t in display"
      :key="t.id"
      :ref="
        (el) => {
          toastEls[t.id] = el as HTMLElement | null
        }
      "
      class="alert cursor-pointer overflow-hidden"
      :class="alertClass[t.type]"
      @click="dismiss(t)"
    >
      <span>{{ t.message }}</span>
    </div>
  </div>
</template>
