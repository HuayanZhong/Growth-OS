<script setup lang="ts">
// 登录表单：为 Supabase Auth 预留结构（邮箱 + 密码 + SSO），SSO 只保留在此表单
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
import { loginSchema } from '@growth-os/types'

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 自动注册（sideEffects:false），
// 不注册则 scale/opacity 等 CSS 属性被忽略（registerPlugin 幂等）
gsap.registerPlugin(CSSPlugin)

// 切换注册表单：由父组件（认证页）监听 switch-to-register 事件
defineEmits<{ switchToRegister: [] }>()

// 表单数据（预留：接入 Supabase 后直接传给 signInWithPassword）
const email = ref('')
const password = ref('')
const submitting = ref(false)
// 字段级输入标记：未输入前不显示对应校验错误，避免空表单默认报错
const emailTouched = ref(false)
const passwordTouched = ref(false)

// zod 字段级校验：各自字段开始输入后才校验（互不交叉）
const emailError = computed(() => {
  if (!emailTouched.value) return undefined
  const result = loginSchema.shape.email.safeParse(email.value)
  return result.success ? undefined : result.error.issues[0]?.message
})
const passwordError = computed(() => {
  if (!passwordTouched.value) return undefined
  const result = loginSchema.shape.password.safeParse(password.value)
  return result.success ? undefined : result.error.issues[0]?.message
})

const { signIn } = useAuth()
const { showToast } = useToast()

// 表单根元素（登录成功离场动画目标）
const rootEl = ref<HTMLElement | null>(null)

// 提交登录
async function onSubmit() {
  if (submitting.value) return
  // 提交时强制校验两个字段（错误分别显示在各字段下方）
  emailTouched.value = true
  passwordTouched.value = true
  // 校验失败不提交
  if (emailError.value || passwordError.value) return
  submitting.value = true
  try {
    const { error } = await signIn(email.value, password.value)
    if (error) {
      showToast(mapAuthError(error), 'error')
      return
    }
    showToast('登录成功', 'success')
    // 动画目标缺失（ref 未绑定/组件重渲染等）时降级直接跳转，
    // 避免 gsap 对 null 目标静默失败、onComplete 不执行导致卡在登录页
    if (!rootEl.value) {
      await navigateTo('/dashboard')
      return
    }
    // 登录成功：表单缩小淡出离场，动画结束再跳转，形成「登录页收起 → 工作台滑入」的过渡
    gsap.to(rootEl.value, {
      opacity: 0,
      scale: 0.94,
      y: -14,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => navigateTo('/dashboard'),
    })
  } catch (err) {
    // 网络/服务端异常时 signIn 会 throw（如 AuthRetryableFetchError），兜底提示避免静默失败
    showToast(err instanceof Error ? err.message : '登录失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

// SSO 登录（预留：接入后调用 signInWithOAuth，QQ/微信需 Supabase 自定义 provider 或代理登录）
function onSso(provider: 'qq' | 'wechat') {
  // TODO: await supabase.auth.signInWithOAuth({ provider })
  void provider
}
</script>

<template>
  <!-- 内容容器（daisyUI hero-content 官方结构，max-w-sm 限宽居中） -->
  <div ref="rootEl" class="hero-content w-full max-w-sm flex-col items-center px-4">
    <!-- 品牌区（简洁文字版） -->
    <div class="text-center">
      <!-- 中文标题用 ZCOOL 卡通体（font-brand 语义令牌）；font-synthesis 关闭避免无 600 字重时合成变形 -->
      <h1 class="font-brand text-2xl tracking-tight text-base-content [font-synthesis:none]">
        欢迎回来
      </h1>
      <p class="mt-1 text-sm text-base-content/60">登录以继续你的成长旅程</p>
    </div>

    <!-- 登录卡片 -->
    <div class="card w-full bg-base-100 shadow-lg">
      <div class="card-body gap-3">
        <!-- 登录表单（novalidate：校验统一交给 zod，避免浏览器原生提示与 zod 重复） -->
        <form class="flex flex-col gap-3" @submit.prevent="onSubmit" novalidate>
          <!-- 邮箱输入（仅支持邮箱登录，label 作容器） -->
          <label class="input">
            <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-width="2.5"
                fill="none"
                stroke="currentColor"
              >
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </g>
            </svg>
            <input
              v-model="email"
              type="email"
              name="email"
              placeholder="请输入邮箱"
              autocomplete="email"
              required
              @input="emailTouched = true"
            />
          </label>
          <!-- zod 字段级错误提示（通过时隐藏占位，避免布局跳动） -->
          <p class="text-sm text-error" aria-live="polite">{{ emailError ?? '' }}</p>

          <!-- 密码输入（右侧眼睛为"显示密码"预留位） -->
          <label class="input">
            <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-width="2.5"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
                ></path>
                <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
              </g>
            </svg>
            <input
              v-model="password"
              type="password"
              name="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              minlength="8"
              required
              @input="passwordTouched = true"
            />
          </label>
          <!-- zod 字段级错误提示（通过时隐藏占位，避免布局跳动） -->
          <p class="text-sm text-error" aria-live="polite">{{ passwordError ?? '' }}</p>

          <!-- 主登录按钮（页面唯一 primary 色；提交中显示 loading 态） -->
          <button type="submit" class="btn btn-primary btn-block" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            {{ submitting ? '提交中' : '登 录' }}
          </button>
        </form>

        <!-- 第三方登录（SSO 只保留在此表单；接入后替换为 supabase.auth.signInWithOAuth） -->
        <div class="divider text-xs text-base-content/50">或</div>
        <div class="grid grid-cols-2 gap-3">
          <!-- QQ 登录（品牌蓝，官方图标） -->
          <button
            type="button"
            class="btn btn-dash btn-info btn-circle btn-block"
            @click="onSso('qq')"
          >
            <!-- 官方 QQ 图标（assets/icons/qq.svg） -->
            <img src="~/assets/icons/qq.svg" alt="QQ logo" class="h-6 w-6" />
            QQ 登录
          </button>
          <button
            type="button"
            class="btn btn-dash btn-circle btn-success btn-block"
            @click="onSso('wechat')"
          >
            <!-- 官方微信图标（assets/icons/微信.svg） -->
            <img src="~/assets/icons/微信.svg" alt="微信 logo" class="h-6 w-6" />
            微信登录
          </button>
        </div>

        <!-- 注册引导（切到注册表单） -->
        <p class="mt-1 text-center text-sm text-base-content/60">
          还没有账号？
          <button class="btn btn-link" @click="$emit('switchToRegister')">立即注册</button>
        </p>
      </div>
    </div>
  </div>
</template>
