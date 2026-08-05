<script setup lang="ts">
// 注册表单：为 Supabase Auth 预留结构（邮箱 + 密码），SSO 按钮只保留在登录表单
import { computed, ref } from 'vue'
import { registerSchema } from '@growth-os/types'

// 切换登录表单：由父组件（认证页）监听 switch-to-login 事件
defineEmits<{ switchToLogin: [] }>()

// 表单数据
const email = ref('')
const password = ref('')
const submitting = ref(false)
// 字段级输入标记：未输入前不显示对应校验错误，避免空表单默认报错
const emailTouched = ref(false)
const passwordTouched = ref(false)
// 注册成功后显示"确认邮件已发送"视图（方案B：Confirm email 开启，signUp 返回 session 为 null）
const registeredEmail = ref('')
const resending = ref(false)

const { signUp, resendConfirmation } = useAuth()
const { showToast } = useToast()

// zod 字段级校验：各自字段开始输入后才校验（互不交叉）
const emailError = computed(() => {
  if (!emailTouched.value) return undefined
  const result = registerSchema.shape.email.safeParse(email.value)
  return result.success ? undefined : result.error.issues[0]?.message
})
const passwordError = computed(() => {
  if (!passwordTouched.value) return undefined
  const result = registerSchema.shape.password.safeParse(password.value)
  return result.success ? undefined : result.error.issues[0]?.message
})

// 提交注册
async function onSubmit() {
  if (submitting.value) return
  // 提交时强制校验两个字段（错误分别显示在各字段下方）
  emailTouched.value = true
  passwordTouched.value = true
  // 校验失败不提交
  if (emailError.value || passwordError.value) return
  submitting.value = true
  try {
    const { data, error } = await signUp(email.value, password.value)
    if (error) {
      showToast(mapAuthError(error), 'error')
      return
    }
    // Confirm email 开启：session 为 null -> 显示确认视图
    // 若 session 非空（Confirm email 关闭场景）-> 显式跳转工作台
    if (data.session === null) {
      registeredEmail.value = email.value
    } else {
      showToast('注册成功', 'success')
      await navigateTo('/dashboard')
    }
  } catch (err) {
    // 网络/服务端异常时 signUp 会 throw（如 AuthRetryableFetchError），兜底提示避免静默失败
    showToast(err instanceof Error ? err.message : '注册失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

// 重发确认邮件
async function onResend() {
  if (resending.value || !registeredEmail.value) return
  resending.value = true
  try {
    const { error } = await resendConfirmation(registeredEmail.value)
    showToast(
      error ? mapAuthError(error) : '确认邮件已重新发送，请查收（注意垃圾邮件文件夹）',
      error ? 'error' : 'success',
    )
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <!-- 内容容器（daisyUI hero-content 官方结构，max-w-sm 限宽居中） -->
  <div class="hero-content w-full max-w-sm flex-col items-center px-4">
    <!-- 品牌区（简洁文字版） -->
    <div class="text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-base-content">创建账号</h1>
      <p class="mt-1 text-sm text-base-content/60">注册以开始你的成长旅程</p>
    </div>

    <!-- 注册卡片 -->
    <div class="card w-full bg-base-100 shadow-lg">
      <div class="card-body gap-3">
        <!-- 确认邮件已发送视图（方案B：注册成功，待邮箱确认） -->
        <div v-if="registeredEmail" class="flex flex-col items-center gap-3 py-4 text-center">
          <div class="text-success">
            <svg
              class="h-12 w-12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-base-content">确认邮件已发送</h2>
          <p class="text-sm text-base-content/60">
            我们已向
            <span class="font-medium text-base-content">{{ registeredEmail }}</span>
            发送确认邮件，请点击邮件中的链接完成注册。
          </p>
          <button
            type="button"
            class="btn btn-ghost btn-block"
            :disabled="resending"
            @click="onResend"
          >
            <span v-if="resending" class="loading loading-spinner loading-sm"></span>
            {{ resending ? '发送中' : '重新发送确认邮件' }}
          </button>
          <button class="btn btn-link" @click="$emit('switchToLogin')">返回登录</button>
        </div>

        <!-- 注册表单（novalidate：校验统一交给 zod，避免浏览器原生提示与 zod 重复） -->
        <form v-else class="flex flex-col gap-3" @submit.prevent="onSubmit" novalidate>
          <!-- 邮箱输入（仅支持邮箱注册，label 作容器） -->
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
              autocomplete="new-password"
              minlength="8"
              required
              @input="passwordTouched = true"
            />
          </label>
          <!-- zod 字段级错误提示（通过时隐藏占位，避免布局跳动） -->
          <p class="text-sm text-error" aria-live="polite">{{ passwordError ?? '' }}</p>

          <!-- 主注册按钮（页面唯一 primary 色；提交中显示 loading 态） -->
          <button type="submit" class="btn btn-primary btn-block btn-circle" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm"></span>
            {{ submitting ? '提交中' : '注 册' }}
          </button>
        </form>

        <!-- 登录引导（切到登录表单；确认视图下隐藏） -->
        <p v-if="!registeredEmail" class="mt-1 text-center text-sm text-base-content/60">
          已有账号？
          <button class="btn btn-link" @click="$emit('switchToLogin')">立即登录</button>
        </p>
      </div>
    </div>
  </div>
</template>
