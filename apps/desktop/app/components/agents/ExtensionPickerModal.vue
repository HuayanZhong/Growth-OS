<script setup lang="ts">
// 扩展选择弹窗：对标 Coze「扩展」弹窗——左侧分类栏（本轮仅技能一类，插件/MCP 后续接入）+
// 右侧「添加技能」标题 / 搜索框（本地过滤）/ 技能卡片列表（线性图标块 + 名称 + 描述 + 添加↔移除）。
// 卡片操作只改 pending 状态：点「确定」回填宿主表单，取消 / × / Esc 关闭即丢弃。
// 细节基调：图标块为目录 tint 底 + 线性图标（内容参数不随主题翻转，字恒深）；按钮走幽灵态降存在感；
// 分类选中态用中性浮起（bg-base-100）而非主题色块，避免紫色滥用。
// 纯视图组件：技能目录（含 icon/tint）来自 utils/skills.ts，此处无业务常量
import { SKILL_LIST } from '~/utils/skills'

const props = defineProps<{ selected: string[] }>()

const emit = defineEmits<{ confirm: [skills: string[]] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const pending = ref<string[]>([])
const keyword = ref('')

// 打开即以宿主当前所选初始化 pending；搜索词清空
function open() {
  pending.value = [...props.selected]
  keyword.value = ''
  dialogEl.value?.showModal()
}

function close() {
  dialogEl.value?.close()
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return SKILL_LIST
  return SKILL_LIST.filter(
    (skill) => skill.name.toLowerCase().includes(kw) || skill.id.includes(kw),
  )
})

function toggle(id: string) {
  pending.value = pending.value.includes(id)
    ? pending.value.filter((item) => item !== id)
    : [...pending.value, id]
}

function onConfirm() {
  emit('confirm', [...pending.value])
  close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialogEl" class="modal">
    <div
      class="modal-box max-w-2xl rounded-3xl border border-base-300/70 bg-base-100 p-0 shadow-xl shadow-base-content/10"
    >
      <div class="flex min-h-96">
        <!-- 左侧分类栏：本轮仅技能一类（插件/MCP 后续接入同一弹窗）；选中项中性浮起，不用主题色块 -->
        <aside class="w-32 shrink-0 border-r border-base-300/60 bg-base-200/50 p-3">
          <p class="px-2 pb-3 text-xs font-semibold tracking-wide text-base-content/40">扩展</p>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-xl bg-base-100 px-3 py-2.5 text-sm font-medium text-base-content shadow-sm"
            aria-current="true"
          >
            <svg
              class="h-4 w-4 text-base-content/70"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="m13 2-2 8h6l-8 12 2-8H5z" />
            </svg>
            技能
          </button>
        </aside>

        <!-- 右侧内容区 -->
        <div class="flex min-w-0 flex-1 flex-col p-5">
          <div class="flex items-center gap-3">
            <h3 class="min-w-0 flex-1 truncate text-lg font-bold">添加技能</h3>
            <label
              class="input input-sm h-9 w-40 rounded-full border-transparent bg-base-200/70 transition-colors focus-within:border-primary/40"
            >
              <svg
                class="h-[1em] opacity-40"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input v-model="keyword" type="text" placeholder="搜索技能" class="grow" />
            </label>
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-sm"
              aria-label="关闭"
              @click="close"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                viewBox="0 0 24 24"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <!-- 技能卡片列表：添加↔移除即时切换（pending），确定后统一回填 -->
          <ul class="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
            <li
              v-for="skill in filtered"
              :key="skill.id"
              class="flex items-center gap-3.5 rounded-2xl border border-base-300/50 bg-base-100 p-3 pl-3.5 transition-colors hover:border-primary/30"
            >
              <!-- 图标块：目录 tint 底 + 线性图标（内容参数，恒深字不随主题翻转） -->
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                :style="{ backgroundColor: skill.tint, color: '#3F3F46' }"
                aria-hidden="true"
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
                  <path :d="skill.icon" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium leading-5">{{ skill.name }}</p>
                <p class="mt-0.5 truncate text-xs leading-4 text-base-content/45">
                  {{ skill.description }}
                </p>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm rounded-lg"
                :class="
                  pending.includes(skill.id) ? 'text-base-content/45' : 'font-medium text-primary'
                "
                :aria-label="`${pending.includes(skill.id) ? '移除' : '添加'}：${skill.name}`"
                @click="toggle(skill.id)"
              >
                {{ pending.includes(skill.id) ? '移除' : '添加' }}
              </button>
            </li>
            <li v-if="!filtered.length" class="py-12 text-center text-sm text-base-content/40">
              没有匹配「{{ keyword }}」的技能
            </li>
          </ul>

          <!-- 底部：确定回填（用户要求的确认步骤，区别于 Coze 即时生效） -->
          <div class="mt-5 flex items-center justify-end gap-1.5">
            <button type="button" class="btn btn-ghost btn-sm rounded-lg" @click="close">
              取消
            </button>
            <button type="button" class="btn btn-primary btn-sm rounded-lg px-6" @click="onConfirm">
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="close">关闭</button>
    </form>
  </dialog>
</template>
