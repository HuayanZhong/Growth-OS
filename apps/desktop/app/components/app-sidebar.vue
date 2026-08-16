<script setup lang="ts">
// 左侧导航栏：品牌区 + 导航菜单（技能/文件/AGENTS/项目）+ 用户区（退出登录）
import { ThemeToggle } from '@growth-os/ui'
import AgentMenu from '~/components/sidebar/agent-menu.vue'
import { useAuth } from '~/composables/useAuth'
import { useNavActive } from '~/composables/useNavActive'

const { getSession, signOutWithFallback } = useAuth()

// 侧边栏根元素：多根组件 $el 为 null，显式暴露给布局做进入动画
// （defineExpose 须在顶层 await 之前同步调用）
const asideEl = ref<HTMLElement | null>(null)
defineExpose({ asideEl })

const session = ref(await getSession())
const { showToast } = useToast()
const { isActive, navClass } = useNavActive()

// 项目菜单折叠状态（智能体菜单在 AgentMenu 内部自持）
const expanded = reactive({ projects: true })

function toggle(key: keyof typeof expanded) {
  expanded[key] = !expanded[key]
}

// 用户头像占位：取邮箱首字母
const initials = computed(() => (session.value?.user.email?.[0] ?? '?').toUpperCase())

// 退出登录确认弹窗（daisyUI modal）
const signOutDialog = ref<HTMLDialogElement | null>(null)

function openSignOutDialog() {
  signOutDialog.value?.showModal()
}

function closeSignOutDialog() {
  signOutDialog.value?.close()
}

async function onSignOut() {
  closeSignOutDialog()
  // 本地会话一定已清除；errorMessage 来自接口返回（如 403 session_not_found），有值说明服务端登出未完成
  const { errorMessage } = await signOutWithFallback()
  showToast(
    errorMessage ? `已退出登录（${errorMessage}）` : '已退出登录',
    errorMessage ? 'warning' : 'success',
  )
  await navigateTo('/auth')
}
</script>

<template>
  <aside
    ref="asideEl"
    class="flex h-full w-60 shrink-0 flex-col border-r border-base-300 bg-base-200"
  >
    <!-- 顶部：品牌区 -->
    <div class="flex h-16 items-center gap-2.5 px-4">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center text-primary"
        aria-hidden="true"
      >
        <!-- 节点网格：三节点沿对角线上升相连，OS 系统隐喻（线条版，currentColor 继承语义色） -->
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          class="h-6 w-6"
          role="img"
          aria-label="Growth OS logo"
        >
          <circle cx="6.5" cy="17.5" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="17.5" cy="6.5" r="2.2" />
          <path d="M8.5 16l2.1-2.4M13.4 10.4l2.1-2.3" />
        </svg>
      </div>
      <div class="min-w-0 flex-1 leading-tight">
        <!-- 品牌名用 Caveat 手写体（font-brand，语义令牌）；中文副标题回退系统字体 -->
        <p class="truncate font-brand text-xl font-bold tracking-tight">Growth OS</p>
        <p class="truncate text-xs text-base-content/50">个人工作台</p>
      </div>
      <ThemeToggle />
    </div>

    <!-- 中部：导航菜单（技能/文件一级平铺在上，AGENTS/项目二级可展开在下） -->
    <nav class="flex-1 overflow-y-auto px-2 py-2">
      <ul class="flex flex-col gap-1">
        <!-- 技能：一级菜单（平铺链接） -->
        <li>
          <NuxtLink
            to="/dashboard/skills"
            :class="navClass('/dashboard/skills')"
            class="flex items-center gap-2 px-2 py-2"
          >
            <svg
              class="h-4 w-4 shrink-0"
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
            <span class="truncate">技能</span>
          </NuxtLink>
        </li>

        <!-- 文件：一级菜单（平铺链接） -->
        <li>
          <NuxtLink
            to="/dashboard/files"
            :class="navClass('/dashboard/files')"
            class="flex items-center gap-2 px-2 py-2"
          >
            <svg
              class="h-4 w-4 shrink-0"
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
            <span class="truncate">文件</span>
          </NuxtLink>
        </li>

        <!-- AGENTS 二级菜单（智能体列表 + 操作，独立组件自持折叠与交互状态） -->
        <AgentMenu />

        <!-- 项目：二级菜单（整行点击展开/收起，箭头仅作指示） -->
        <li>
          <div
            class="group flex items-center rounded-lg transition-colors hover:bg-base-300"
            :class="isActive('/dashboard/projects') ? 'bg-primary/10' : ''"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 px-2 py-2"
              :class="
                isActive('/dashboard/projects')
                  ? 'font-medium text-primary'
                  : 'text-base-content/70'
              "
              :aria-expanded="expanded.projects"
              @click="toggle('projects')"
            >
              <svg
                class="h-3.5 w-3.5 shrink-0 transition-transform"
                :class="expanded.projects ? 'rotate-90' : ''"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <svg
                class="h-4 w-4 shrink-0"
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
              <span class="truncate">项目</span>
            </button>
            <button
              type="button"
              class="shrink-0 p-2 text-base-content/40 opacity-0 transition-all hover:text-primary group-hover:opacity-100"
              title="新建项目"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </button>
          </div>
          <ul v-if="expanded.projects" class="flex flex-col pb-1 pl-9 pr-2">
            <li class="py-1 text-sm text-base-content/50">暂无项目</li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- 底部：用户区 -->
    <div class="border-t border-base-300 p-3">
      <div class="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-base-300/60">
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
          @click="openSignOutDialog"
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

  <!-- 退出登录确认弹窗 -->
  <dialog ref="signOutDialog" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">确认退出登录？</h3>
      <p class="py-4 text-sm text-base-content/70">
        退出后需重新登录才能访问工作台，确定要继续吗？
      </p>
      <div class="modal-action">
        <button type="button" class="btn" @click="closeSignOutDialog">取消</button>
        <button type="button" class="btn btn-primary" @click="onSignOut">确认退出</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeSignOutDialog">关闭</button>
    </form>
  </dialog>
</template>
