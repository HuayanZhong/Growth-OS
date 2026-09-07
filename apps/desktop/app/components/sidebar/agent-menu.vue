<script setup lang="ts">
// AGENTS 二级菜单：折叠头部 + 智能体列表（列表数据来自 agents 域 feature，
// 空态退回内置占位「小芽」）；悬停显示置顶 / 更多操作（重命名）（对标 Coze）
import { useNavActive } from '~/composables/useNavActive'
import { useToast } from '~/composables/useToast'
import { ApiError } from '~/composables/useApi'
import { useAgents } from '~/features/agents/use-agents'

const { isActive } = useNavActive()
const { showToast } = useToast()
const { agents, refresh, createAgent, renameAgent } = useAgents()

// 菜单折叠状态（与项目菜单互相独立）
const expanded = ref(true)

// 内置占位智能体：后端无数据时的空态保底。id 为空串标识非持久化实体——
// 重命名仅写本地状态，置顶同理；Agent 持久化落地后由真实列表替代
const builtinName = ref('小芽')
const builtinPinned = ref(false)

/** 菜单展示项：后端有数据用真实列表，否则退回内置占位 */
const menuAgents = computed(() =>
  agents.value.length > 0
    ? agents.value.map((a) => ({ id: a.id, name: a.name }))
    : [{ id: '', name: builtinName.value }],
)

// 「更多」菜单当前展开项 id（'' = 未展开 / 占位项自身）
const openMenuId = ref('')

// 重命名弹窗
const renameDialog = ref<HTMLDialogElement | null>(null)
const renameInput = ref('')
const renameInputEl = ref<HTMLInputElement | null>(null)
const renameTarget = ref<{ id: string; name: string } | null>(null)

// 新建弹窗
const createDialog = ref<HTMLDialogElement | null>(null)
const createInput = ref('')
const createInputEl = ref<HTMLInputElement | null>(null)
const isCreating = ref(false)

// 初次挂载拉取真实列表；失败透出提示（列表保持空 → 空态保底占位）
onMounted(() => {
  refresh().catch((error: unknown) => {
    showToast(error instanceof ApiError ? error.message : 'Agent 列表加载失败', 'error')
  })
})

function toggle() {
  expanded.value = !expanded.value
}

// 置顶内置占位智能体（置顶字段随持久化落地，真实 Agent 暂不支持）
function toggleBuiltinPin() {
  builtinPinned.value = !builtinPinned.value
}

// 更多操作菜单（按项开合）
function toggleAgentMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? '' : id
}

// 打开重命名弹窗
function openRenameDialog(agent: { id: string; name: string }) {
  openMenuId.value = ''
  renameTarget.value = agent
  renameInput.value = agent.name
  renameDialog.value?.showModal()
  nextTick(() => renameInputEl.value?.focus())
}

// 关闭重命名弹窗
function closeRenameDialog() {
  renameDialog.value?.close()
  renameTarget.value = null
}

// 保存重命名：占位项写本地状态；真实 Agent 走 PATCH，失败透出信封文案（骨架期 501）
async function onRename() {
  const target = renameTarget.value
  const name = renameInput.value.trim()
  if (!target || !name) return
  if (target.id === '') {
    builtinName.value = name
    closeRenameDialog()
    return
  }
  try {
    await renameAgent(target.id, name)
    closeRenameDialog()
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : '重命名 Agent 失败', 'error')
  }
}

// 打开新建弹窗
function openCreateDialog() {
  createInput.value = ''
  createDialog.value?.showModal()
  nextTick(() => createInputEl.value?.focus())
}

// 关闭新建弹窗
function closeCreateDialog() {
  createDialog.value?.close()
}

// 创建 Agent：骨架期写路径 501，错误信封文案经 toast 透出；
// systemPrompt 留空、model 先内置默认（模型配置目录落地后改由配置提供）
async function onCreate() {
  const name = createInput.value.trim()
  if (!name || isCreating.value) return
  isCreating.value = true
  try {
    await createAgent({ name, systemPrompt: '', model: 'deepseek-chat' })
    closeCreateDialog()
  } catch (error) {
    showToast(error instanceof ApiError ? error.message : '创建 Agent 失败', 'error')
  } finally {
    isCreating.value = false
  }
}

// 点击页面其他区域关闭「更多」菜单
function onDocClick() {
  openMenuId.value = ''
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
        @click="openCreateDialog"
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
      <li v-for="agent in menuAgents" :key="agent.id || 'builtin'">
        <div
          class="group flex items-center rounded-lg transition-colors"
          :class="
            isActive('/dashboard/agents') && agent.id === '' ? 'bg-primary/10' : 'hover:bg-base-300'
          "
        >
          <NuxtLink
            to="/dashboard/agents"
            class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-sm transition-colors"
            :class="
              isActive('/dashboard/agents') && agent.id === ''
                ? 'font-medium text-primary'
                : 'text-base-content/70'
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
            <span class="truncate">{{ agent.name }}</span>
          </NuxtLink>
          <!-- 悬停显示的操作：置顶（仅内置占位）+ 更多（重命名） -->
          <div
            class="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity"
            :class="openMenuId === agent.id ? 'opacity-100' : 'group-hover:opacity-100'"
          >
            <button
              v-if="agent.id === ''"
              type="button"
              class="p-1 text-base-content/40 transition-colors hover:text-primary"
              :title="builtinPinned ? '取消置顶' : '置顶'"
              @click="toggleBuiltinPin"
            >
              <svg
                class="h-4 w-4"
                :class="builtinPinned ? 'text-primary' : ''"
                :fill="builtinPinned ? 'currentColor' : 'none'"
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
                @click.stop="toggleAgentMenu(agent.id)"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              <ul
                v-if="openMenuId === agent.id"
                class="absolute right-0 top-full z-10 mt-1 w-32 overflow-hidden rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-base-200"
                    @click="openRenameDialog(agent)"
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

  <!-- 重命名 Agent 弹窗 -->
  <dialog ref="renameDialog" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">重命名智能体</h3>
      <input
        ref="renameInputEl"
        v-model="renameInput"
        type="text"
        name="agent-name"
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

  <!-- 新建 Agent 弹窗 -->
  <dialog ref="createDialog" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">新建 Agent</h3>
      <input
        ref="createInputEl"
        v-model="createInput"
        type="text"
        name="new-agent-name"
        class="input input-bordered mt-4 w-full"
        placeholder="输入名称"
        maxlength="20"
        @keyup.enter="onCreate"
      />
      <div class="modal-action">
        <button type="button" class="btn" @click="closeCreateDialog">取消</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!createInput.trim() || isCreating"
          @click="onCreate"
        >
          {{ isCreating ? '创建中…' : '创建' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="closeCreateDialog">关闭</button>
    </form>
  </dialog>
</template>
