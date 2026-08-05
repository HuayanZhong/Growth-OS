<script setup lang="ts">
// Dashboard 布局：左侧导航 + 右侧内容区（对标 Coze 桌面端）
import { computed, ref } from 'vue'
import { useAuth, mapAuthError } from '~/composables/useAuth'
import { ThemeToggle } from '@growth-os/ui'

const route = useRoute()
const { getSession, signOut } = useAuth()
const session = ref(await getSession())
const { showToast } = useToast()

// 导航项激活判断：exact 精确匹配（概览），否则前缀匹配（子路由同样高亮）
function isActive(path: string, exact = false) {
  if (exact) return route.path === path
  return route.path === path || route.path.startsWith(`${path}/`)
}

// 导航链接样式：激活态 primary 高亮，未激活态悬停渐变
function navClass(path: string, exact = false) {
  return isActive(path, exact)
    ? 'rounded-lg bg-primary font-medium text-primary-content shadow-sm transition-colors'
    : 'rounded-lg text-base-content/70 transition-colors hover:bg-base-300'
}

// 用户头像占位：取邮箱首字母
const initials = computed(() => (session.value?.user.email?.[0] ?? '?').toUpperCase())

async function onSignOut() {
  const { error } = await signOut()
  if (error) {
    showToast(mapAuthError(error), 'error')
    return
  }
  // 登出后显式跳转登录页：守卫只在导航发生时执行，不导航会停留在 dashboard
  showToast('已退出登录', 'success')
  await navigateTo('/auth')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- 左侧导航栏 -->
    <aside class="flex h-full w-60 shrink-0 flex-col border-r border-base-300 bg-base-200">
      <!-- 顶部：品牌区 -->
      <div class="flex h-16 items-center gap-2.5 px-4">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-content shadow-sm"
        >
          G
        </div>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-bold tracking-tight">Growth OS</p>
          <p class="truncate text-xs text-base-content/50">个人工作台</p>
        </div>
        <ThemeToggle />
      </div>

      <!-- 中部：导航菜单 -->
      <nav class="flex-1 overflow-y-auto px-3 py-3">
        <ul class="menu w-full gap-0.5 px-0">
          <li class="menu-title px-2 pb-1 text-xs uppercase tracking-wider text-base-content/40">
            工作台
          </li>
          <li>
            <NuxtLink to="/dashboard" :class="navClass('/dashboard', true)">
              <svg
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
              <span>概览</span>
            </NuxtLink>
          </li>

          <li
            class="menu-title px-2 pb-1 pt-3 text-xs uppercase tracking-wider text-base-content/40"
          >
            资源
          </li>
          <li>
            <NuxtLink to="/dashboard/agents" :class="navClass('/dashboard/agents')">
              <svg
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
              <span>AGENTS</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/dashboard/skills" :class="navClass('/dashboard/skills')">
              <svg
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                />
              </svg>
              <span>技能</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/dashboard/projects" :class="navClass('/dashboard/projects')">
              <svg
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
                />
              </svg>
              <span>项目</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/dashboard/files" :class="navClass('/dashboard/files')">
              <svg
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              <span>文件</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- 底部：用户区 -->
      <div class="border-t border-base-300 p-3">
        <div
          class="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-base-300/60"
        >
          <div class="avatar avatar-placeholder shrink-0">
            <div class="w-9 rounded-full bg-primary/15 text-sm font-semibold text-primary">
              <span>{{ initials }}</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ session?.user.email ?? '未登录' }}</p>
            <p class="flex items-center gap-1.5 text-xs text-base-content/50">
              <span class="h-1.5 w-1.5 rounded-full bg-success" />
              已登录
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square shrink-0"
            title="退出登录"
            @click="onSignOut"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="flex-1 overflow-auto bg-base-100">
      <slot />
    </main>
  </div>
</template>
