<script setup lang="ts">
// 认证页：hero 骨架 + 暗夜切换 + 登录/注册切换（GSAP 3D 翻转过渡动画）
import { nextTick, ref } from 'vue'
// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 的自动注册（sideEffects:false），
// 不注册则 rotationY/opacity 等 CSS 属性全部被忽略（"Missing plugin"），动画不生效
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
import { ThemeToggle } from '@growth-os/ui'
import AuthLogin from '~/components/auth/login.vue'
import AuthRegister from '~/components/auth/register.vue'

gsap.registerPlugin(CSSPlugin)

// 当前展示的表单：login | register
const mode = ref<'login' | 'register'>('login')
// 切换中锁：动画（退出 + 入场）完成前忽略新的切换请求，防止快速连点叠加多次翻转
const switching = ref(false)
const loginRef = ref<InstanceType<typeof AuthLogin>>()
const registerRef = ref<InstanceType<typeof AuthRegister>>()

// 定位表单根元素：Nuxt 4 下条件渲染组件的 $el 可能是 fragment 锚点（Text/注释节点），
// 命中元素节点直接返回，否则从父容器取 .hero-content
function formRoot(el: unknown): HTMLElement | null {
  if (!el) return null
  return (el as Node).nodeType === Node.ELEMENT_NODE
    ? (el as HTMLElement)
    : ((el as Node).parentElement?.querySelector('.hero-content') ?? null)
}

// 3D 半程翻页：旧表单绕 Y 轴翻到 -90°（侧面朝上、不可见）→ 切换内容 → 新表单从 +90° 翻回 0°。
// 透视固定在父容器（.hero 的 perspective 样式），翻转只动 rotationY——
// 若把 transformPerspective 当动画属性，透视值会从极小过渡到 1200px，近大远小极端变形并触发滚动条闪烁。
function switchMode(next: 'login' | 'register') {
  if (mode.value === next || switching.value) return
  switching.value = true
  const curEl = formRoot(mode.value === 'login' ? loginRef.value?.$el : registerRef.value?.$el)
  gsap
    .timeline({
      onComplete: async () => {
        mode.value = next
        await nextTick()
        const nextEl = formRoot(next === 'login' ? loginRef.value?.$el : registerRef.value?.$el)
        if (nextEl) {
          gsap.fromTo(
            nextEl,
            { rotationY: 90 },
            {
              rotationY: 0,
              duration: 0.5,
              ease: 'back.out(1.5)',
              clearProps: 'transform',
              // 入场动画结束才解锁，切换全程忽略连点
              onComplete: () => {
                switching.value = false
              },
            },
          )
        } else {
          switching.value = false
        }
      },
    })
    .to(curEl, { rotationY: -90, duration: 0.4, ease: 'power2.in' })
}
</script>

<template>
  <!-- 全屏居中容器（daisyUI hero 官方结构）；perspective 固定透视，供 3D 翻转使用 -->
  <div class="hero min-h-screen bg-base-200 perspective-distant">
    <!-- 暗夜模式切换（fixed 固定右上角，由 @growth-os/ui 提供） -->
    <div class="fixed right-6 top-6">
      <ThemeToggle />
    </div>

    <!-- 登录/注册切换（GSAP 手动控制过渡动画，不依赖 Vue Transition） -->
    <AuthLogin
      v-if="mode === 'login'"
      ref="loginRef"
      @switch-to-register="switchMode('register')"
    />
    <AuthRegister v-else ref="registerRef" @switch-to-login="switchMode('login')" />
  </div>
</template>
