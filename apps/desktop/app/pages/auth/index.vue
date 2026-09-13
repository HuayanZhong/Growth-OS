<script setup lang="ts">
// 认证页：hero 骨架 + 暗夜切换 + 登录/注册切换（GSAP 3D 翻转过渡动画）
// 翻转的 timeline 编排按动画规则保持手写；插件注册与目标归一化收拢在 useGsapTransition
import { gsap } from 'gsap'
import { ThemeToggle } from '@growth-os/ui'
import AuthLogin from '~/components/auth/login.vue'
import AuthRegister from '~/components/auth/register.vue'

const { normalizeTarget, enter } = useGsapTransition()

// 当前展示的表单：login | register
const mode = ref<'login' | 'register'>('login')
// 切换中锁：动画（退出 + 入场）完成前忽略新的切换请求，防止快速连点叠加多次翻转
const switching = ref(false)
const loginRef = ref<InstanceType<typeof AuthLogin>>()
const registerRef = ref<InstanceType<typeof AuthRegister>>()

// 3D 半程翻页：旧表单绕 Y 轴翻到 -90°（侧面朝上、不可见）→ 切换内容 → 新表单从 +90° 翻回 0°。
// 透视固定在父容器（.hero 的 perspective 样式），翻转只动 rotationY——
// 若把 transformPerspective 当动画属性，透视值会从极小过渡到 1200px，近大远小极端变形并触发滚动条闪烁。
function switchMode(next: 'login' | 'register') {
  if (mode.value === next || switching.value) return
  switching.value = true
  const curEl = normalizeTarget(
    mode.value === 'login' ? loginRef.value : registerRef.value,
    '.hero-content',
  )
  gsap
    .timeline({
      onComplete: async () => {
        mode.value = next
        await nextTick()
        const nextEl = normalizeTarget(
          next === 'login' ? loginRef.value : registerRef.value,
          '.hero-content',
        )
        if (nextEl) {
          // 入场动画结束才解锁，切换全程忽略连点
          enter(
            nextEl,
            { rotationY: 90 },
            {
              rotationY: 0,
              duration: 0.5,
              ease: 'back.out(1.5)',
              clearProps: 'transform',
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

// 页面入场动画：表单从下方淡入上移（首次访问与登出回到登录页时播放）
onMounted(async () => {
  await nextTick()
  const el = normalizeTarget(
    mode.value === 'login' ? loginRef.value : registerRef.value,
    '.hero-content',
  )
  if (el) {
    enter(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
  }
})
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
