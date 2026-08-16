<script setup lang="ts">
// AGENTS 二级菜单：折叠头部 + 智能体列表项（默认智能体「小芽」）
// 列表项悬停显示置顶 / 更多操作（重命名）（对标 Coze）
import { useNavActive } from '~/composables/useNavActive'

const { isActive } = useNavActive()

// 菜单折叠状态（与项目菜单互相独立）
const expanded = ref(true)

// 默认智能体交互：名称、置顶态、更多菜单、重命名弹窗
const agentName = ref('小芽')
const agentPinned = ref(false)
const agentMenuOpen = ref(false)
const renameDialog = ref<HTMLDialogElement | null>(null)
const renameInput = ref('')
const renameInputEl = ref<HTMLInputElement | null>(null)

function toggle() {
  expanded.value = !expanded.value
}

// 置顶智能体（小芽）
function toggleAgentPin() {
  agentPinned.value = !agentPinned.value
}

// 更多操作菜单（重命名）
function toggleAgentMenu() {
  agentMenuOpen.value = !agentMenuOpen.value
}

// 打开重命名弹窗
function openRenameDialog() {
  agentMenuOpen.value = false
  renameInput.value = agentName.value
  renameDialog.value?.showModal()
  nextTick(() => renameInputEl.value?.focus())
}

// 关闭重命名弹窗
function closeRenameDialog() {
  renameDialog.value?.close()
}

// 保存重命名智能体（小芽）
function onRename() {
  const name = renameInput.value.trim()
  if (name) agentName.value = name
  closeRenameDialog()
}

// 点击页面其他区域关闭「更多」菜单
function onDocClick() {
  agentMenuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <!-- AGENTS：二级菜单（整行点击展开/收起，箭头仅作指示） -->
  <li>
    <div class="group flex items-center rounded-lg transition-colors hover:bg-base-300">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-base-content/70"
        :aria-expanded="expanded"
        @click="toggle"
      >
        <svg
          class="h-3.5 w-3.5 shrink-0 transition-transform"
          :class="expanded ? 'rotate-90' : ''"
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
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
        <span class="truncate">AGENTS</span>
      </button>
      <button
        type="button"
        class="shrink-0 p-2 text-base-content/40 opacity-0 transition-all hover:text-primary group-hover:opacity-100"
        title="新建 Agent"
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
    <ul v-if="expanded" class="flex flex-col gap-0.5 pb-1">
      <li>
        <div
          class="group flex items-center rounded-lg transition-colors"
          :class="isActive('/dashboard/agents') ? 'bg-primary/10' : 'hover:bg-base-300'"
        >
          <NuxtLink
            to="/dashboard/agents"
            class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm transition-colors"
            :class="
              isActive('/dashboard/agents') ? 'font-medium text-primary' : 'text-base-content/70'
            "
          >
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-primary to-secondary text-primary-content"
            >
              <svg
                class="h-3 w-3"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 21v-9" />
                <path d="M12 12c-3.2 0-5.5-1.7-5.5-5 3.2 0 5.5 1.7 5.5 5Z" />
                <path d="M12 12c3.2 0 5.5-1.7 5.5-5-3.2 0-5.5 1.7-5.5 5Z" />
              </svg>
            </span>
            <span class="truncate">{{ agentName }}</span>
          </NuxtLink>
          <!-- 悬停显示的操作：置顶 + 更多（重命名） -->
          <div
            class="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity"
            :class="agentMenuOpen ? 'opacity-100' : 'group-hover:opacity-100'"
          >
            <button
              type="button"
              class="p-1 text-base-content/40 transition-colors hover:text-primary"
              :title="agentPinned ? '取消置顶' : '置顶'"
              @click="toggleAgentPin"
            >
              <svg
                class="h-4 w-4"
                :class="agentPinned ? 'text-primary' : ''"
                :fill="agentPinned ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 17v5" />
                <path
                  d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"
                />
              </svg>
            </button>
            <div class="relative">
              <button
                type="button"
                class="p-1 text-base-content/40 transition-colors hover:text-primary"
                title="更多操作"
                @click.stop="toggleAgentMenu"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              <ul
                v-if="agentMenuOpen"
                class="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-base-200"
                    @click="openRenameDialog"
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
                      <path
                        d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                      />
                      <path d="m15 5 4 4" />
                    </svg>
                    重命名
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </li>

  <!-- 重命名智能体弹窗 -->
  <dialog ref="renameDialog" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">重命名智能体</h3>
      <input
        ref="renameInputEl"
        v-model="renameInput"
        type="text"
        class="input input-bordered mt-4 w-full"
        placeholder="输入名称"
        maxlength="20"
        @keyup.enter="onRename"
      />
      <div class="modal-action">
        <button type="button" class="btn" @click="closeRenameDialog">取消</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!renameInput.trim()"
          @click="onRename"
        >
          保存
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeRenameDialog">关闭</button>
    </form>
  </dialog>
</template>
