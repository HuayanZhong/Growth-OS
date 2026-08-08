<script setup lang="ts">
// Dashboard 布局：左侧导航 + 右侧内容区（对标 Coze 桌面端）
// 进入动画：整体淡入 + 侧边栏左滑入 + 内容区右滑入（GSAP 手动编排，登录→工作台过渡）
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'
import { useAuth } from '~/composables/useAuth'
import { ThemeToggle } from '@growth-os/ui'

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 自动注册（sideEffects:false），
// 不注册则 x/opacity 等 CSS 属性被忽略，动画不生效（registerPlugin 幂等）
gsap.registerPlugin(CSSPlugin)

const route = useRoute()
const { getSession, signOutWithFallback } = useAuth()
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

// 进入动画目标（布局自身元素，挂载即存在，不依赖异步页面渲染）
const rootRef = ref<HTMLElement | null>(null)
const asideRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)

// 登录成功进入工作台：整页淡入，侧边栏从左侧、内容区从右侧滑入（timeline 错峰编排）
onMounted(async () => {
  await nextTick()
  const rootEl = rootRef.value
  if (!rootEl) return
  gsap
    .timeline({
      onComplete: () => {
        // 清理残留 transform/opacity，防止影响后续导航与主题切换
        gsap.set([rootRef.value, asideRef.value, mainRef.value], {
          clearProps: 'transform,opacity',
        })
      },
    })
    .fromTo(rootEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
    .fromTo(
      asideRef.value,
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
  gsap.killTweensOf([rootRef.value, asideRef.value, mainRef.value])
})
</script>

<template>
  <div ref="rootRef" class="flex h-screen overflow-hidden">
    <!-- 左侧导航栏 -->
    <aside
      ref="asideRef"
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

    <!-- 右侧内容区 -->
    <main ref="mainRef" class="flex-1 overflow-auto bg-base-100">
      <slot />
    </main>
  </div>

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
