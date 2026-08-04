<script setup lang="ts">
// Dashboard 布局：左侧导航 + 右侧内容区（对标 Coze 桌面端）
import { ref } from 'vue'
import { useAuth, mapAuthError } from '~/composables/useAuth'
import { ThemeToggle } from '@growth-os/ui'

const route = useRoute()
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
  <div class="flex h-screen overflow-hidden">
    <!-- 左侧导航栏 -->
    <aside class="flex h-full w-60 flex-col border-r border-base-300 bg-base-200">
      <!-- 顶部：应用标识 -->
      <div class="flex h-16 items-center gap-2 px-5">
        <span class="text-lg font-bold text-primary">Growth OS</span>
      </div>

      <!-- 中部：导航菜单 -->
      <nav class="flex-1 overflow-y-auto px-3 py-2">
        <ul class="menu w-full gap-1 px-0">
          <li>
            <NuxtLink
              to="/dashboard"
              :class="{ active: route.path === '/dashboard' }"
              class="rounded-lg transition-colors"
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
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
              <span>概览</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/dashboard/agents"
              :class="{ active: route.path === '/dashboard/agents' }"
              class="rounded-lg transition-colors"
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
            <NuxtLink
              to="/dashboard/skills"
              :class="{ active: route.path === '/dashboard/skills' }"
              class="rounded-lg transition-colors"
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
                <path
                  d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
                />
              </svg>
              <span>技能</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/dashboard/projects"
              :class="{ active: route.path === '/dashboard/projects' }"
              class="rounded-lg transition-colors"
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
                <path
                  d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
                />
              </svg>
              <span>项目</span>
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/dashboard/files"
              :class="{ active: route.path === '/dashboard/files' }"
              class="rounded-lg transition-colors"
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

      <!-- 底部：用户信息 + 退出 + 主题切换 -->
      <div class="flex items-center gap-2 border-t border-base-300 px-4 py-3">
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm text-base-content/70">
            {{ session?.user.email ?? '未知用户' }}
          </span>
        </div>
        <ThemeToggle />
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square"
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
    </aside>

    <!-- 右侧内容区 -->
    <main class="flex-1 overflow-auto bg-base-100">
      <slot />
    </main>
  </div>
</template>
