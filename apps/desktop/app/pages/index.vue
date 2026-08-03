<script setup lang="ts">
// 首页：登录后落地页。
// 未登录访问会被全局守卫 auth.global.ts 重定向到 /auth
import { ref } from 'vue'
import { useAuth, mapAuthError } from '~/composables/useAuth'

const { getSession, signOut } = useAuth()
const session = ref(await getSession())
const { showToast } = useToast()

async function onSignOut() {
  const { error } = await signOut()
  if (error) {
    showToast(mapAuthError(error), 'error')
    return
  }
  // 登出后全局守卫会把当前页重定向到 /auth
  showToast('已退出登录', 'success')
}
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Growth OS</h1>
        <p class="py-6">已登录用户:{{ session?.user.email ?? '未知' }}</p>
        <button class="btn btn-primary" @click="onSignOut">退出登录</button>
      </div>
    </div>
  </div>
</template>
