<script setup lang="ts">
// Dashboard 布局：左侧导航 + 右侧内容区（对标 Coze 桌面端）
// 进入动画：整体淡入 + 侧边栏左滑入 + 内容区右滑入（GSAP 手动编排，登录→工作台过渡）
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
import AppSidebar from '~/components/app-sidebar.vue'

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 自动注册（sideEffects:false），
// 不注册则 x/opacity 等 CSS 属性被忽略，动画不生效（registerPlugin 幂等）
gsap.registerPlugin(CSSPlugin)

const route = useRoute()

// 进入动画目标（布局自身元素，挂载即存在，不依赖异步页面渲染；
// AppSidebar 为多根组件，$el 为 null，通过暴露的 asideEl 取侧边栏元素）
const rootRef = ref<HTMLElement | null>(null)
const asideRef = ref<{ asideEl: HTMLElement | null } | null>(null)
const mainRef = ref<HTMLElement | null>(null)

// 登录成功进入工作台：整页淡入，侧边栏从左侧、内容区从右侧滑入（timeline 错峰编排）
onMounted(async () => {
  await nextTick()
  const rootEl = rootRef.value
  const asideEl = asideRef.value?.asideEl ?? null
  if (!rootEl) return
  gsap
    .timeline({
      onComplete: () => {
        // 清理残留 transform/opacity，防止影响后续导航与主题切换
        gsap.set([rootEl, asideEl, mainRef.value], {
          clearProps: 'transform,opacity',
        })
      },
    })
    .fromTo(rootEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
    .fromTo(
      asideEl,
      { x: -24, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      0.02,
    )
    .fromTo(
      mainRef.value,
      { x: 40, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      0.08,
    )
})

// 侧边栏切换页面：内容区快速推进过渡（布局不重挂载，路由变化时手动动画。
// watch 非 immediate，布局挂载时的入场动画由 onMounted 负责，这里只处理后续导航）
watch(
  () => route.path,
  async () => {
    await nextTick()
    // 新页面组件可能跨帧异步挂载（chunk 加载），下一帧再取内容容器
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    const mainEl = mainRef.value
    if (!mainEl) return
    gsap.killTweensOf(mainEl)
    gsap.fromTo(
      mainEl,
      { opacity: 0, x: 28 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity' },
    )
  },
)

// 布局卸载（登出等）时终止进行中的动画，避免泄漏
onUnmounted(() => {
  gsap.killTweensOf([rootRef.value, asideRef.value?.asideEl, mainRef.value])
})
</script>

<template>
  <div ref="rootRef" class="flex h-screen overflow-hidden">
    <!-- 左侧导航栏 -->
    <AppSidebar ref="asideRef" />

    <!-- 右侧内容区 -->
    <main ref="mainRef" class="flex-1 overflow-auto bg-base-100">
      <slot />
    </main>
  </div>
</template>
