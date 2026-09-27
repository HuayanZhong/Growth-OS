<script setup lang="ts">
// 创建 Agent 弹窗（布局 A）：左侧动态小球实时预览 + 右侧名称/描述表单 + 底部表情网格 + 色板 + 扩展能力。
// 纯视图组装：表单状态机见 composables/useCreateAgentForm.ts，扩展选择弹窗见 agents/ExtensionPickerModal.vue；
// 此处仅弹窗开关（open/close）与事件接线，无表单状态与业务逻辑
import ExtensionPickerModal from '~/components/agents/ExtensionPickerModal.vue'
import { useCreateAgentForm } from '~/composables/useCreateAgentForm'
import { AGENT_AVATAR_OPTIONS, AVATAR_COLOR_OPTIONS } from '~/utils/agents'

const dialogEl = ref<HTMLDialogElement | null>(null)
const skillPicker = ref<{ open: () => void } | null>(null)

const form = useCreateAgentForm()

// 打开即重置：任何关闭路径（取消/Esc/遮罩）后再次打开都不残留上次输入
function open() {
  form.reset()
  dialogEl.value?.showModal()
}

function close() {
  dialogEl.value?.close()
}

// 事件接线：先关弹窗（宿主职责）再走业务流——弹窗挂载于持久布局，路由切换不会卸载它
function onSubmit() {
  close()
  form.submit()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialogEl" class="modal">
    <div
      class="modal-box max-w-xl rounded-3xl border border-base-300 bg-linear-to-b from-base-100 to-base-200 shadow-xl shadow-base-content/5"
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold">创建 Agent</h3>
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

      <!-- 左：动态预览 + 右：表单 -->
      <div class="mt-4 flex gap-5">
        <div
          data-test="preview"
          class="flex w-28 shrink-0 flex-col items-center justify-center rounded-2xl border border-base-300/60 bg-base-200/50 p-3"
        >
          <span class="h-24 w-24">
            <EmotionBall :emotion="form.selectedEmotion" :color="form.selectedColor" />
          </span>
          <p class="mt-1 text-xs text-base-content/50">
            {{ form.selectedEmotionName
            }}<template v-if="form.selectedColorName"> · {{ form.selectedColorName }}</template>
          </p>
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <div>
            <p class="mb-1.5 text-sm text-base-content/70">
              名称 <span class="text-error">*</span>
            </p>
            <label class="input w-full">
              <input
                v-model="form.name"
                type="text"
                placeholder="给 Agent 起个名字"
                maxlength="20"
                class="grow"
              />
            </label>
          </div>
          <div>
            <p class="mb-1.5 text-sm text-base-content/70">描述（可选）</p>
            <textarea
              v-model="form.description"
              rows="3"
              maxlength="100"
              placeholder="让 TA 擅长什么…"
              class="textarea w-full resize-none"
            />
          </div>
        </div>
      </div>

      <!-- 表情网格：点选即预览，选中态高亮 -->
      <div class="mt-5">
        <p class="mb-2 text-sm text-base-content/70">选择形象</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in AGENT_AVATAR_OPTIONS"
            :key="option.id"
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-xl border transition-colors"
            :class="
              option.id === form.selectedEmotion
                ? 'border-primary bg-primary/10'
                : 'border-base-300 hover:bg-base-content/5'
            "
            :title="option.name"
            :aria-label="`形象：${option.name}`"
            :aria-pressed="option.id === form.selectedEmotion"
            @click="form.selectedEmotion = option.id"
          >
            <span class="h-8 w-8">
              <EmotionBall :emotion="option.id" :color="form.selectedColor" />
            </span>
          </button>
        </div>
      </div>

      <!-- 色板：点选即预览，选中态高亮；色块底色为数据驱动的角色画布参数（非 UI 语义色），经 style 注入 -->
      <div class="mt-4">
        <p class="mb-2 text-sm text-base-content/70">形象颜色</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="colorOption in AVATAR_COLOR_OPTIONS"
            :key="colorOption.id"
            type="button"
            class="h-7 w-7 rounded-full border-2 transition-transform"
            :class="
              colorOption.id === form.selectedColor
                ? 'scale-110 border-primary'
                : 'border-base-300 hover:scale-105'
            "
            :style="{ backgroundColor: colorOption.id }"
            :title="colorOption.name"
            :aria-label="`颜色：${colorOption.name}`"
            :aria-pressed="colorOption.id === form.selectedColor"
            @click="form.selectedColor = colorOption.id"
          />
        </div>
      </div>

      <!-- 扩展能力：整条虚线选择框对齐 Coze（dashed + 无底色 = 待填充语义）——未选择时显示占位文案，
           选择后以「类别项（图标 + 名称 + 计数）」淡底 chip 呈现（插件/MCP 后续并列）；
           占位文案与右端裸 ＋ 均打开扩展选择弹窗（ExtensionPickerModal 确定后回填） -->
      <div class="mt-4">
        <p class="mb-2 text-sm text-base-content/70">扩展能力</p>
        <div
          class="flex w-full items-center gap-4 rounded-xl border border-dashed border-base-300 px-3 py-2"
        >
          <template v-if="form.selectedSkills.length">
            <button
              type="button"
              class="flex items-center gap-1 rounded-md bg-base-200 px-2 py-0.5 text-sm transition-colors hover:bg-base-300/70"
              aria-label="选择技能"
              @click="skillPicker?.open()"
            >
              <svg
                class="h-3.5 w-3.5 text-primary"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m13 2-2 8h6l-8 12 2-8H5z" />
              </svg>
              <span>技能</span>
              <span>+{{ form.selectedSkills.length }}</span>
            </button>
          </template>
          <button
            v-else
            type="button"
            class="min-w-0 flex-1 truncate text-left text-sm text-base-content/50 transition-colors hover:text-base-content/70"
            aria-label="添加技能"
            @click="skillPicker?.open()"
          >
            添加扩展能力（插件、技能和 MCP）
          </button>
          <button
            type="button"
            class="ml-auto flex h-6 w-6 shrink-0 items-center justify-center text-base-content/40 transition-colors hover:text-base-content"
            aria-label="添加技能"
            @click="skillPicker?.open()"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 页脚 -->
      <div class="modal-action">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn-primary" :disabled="!form.canCreate" @click="onSubmit">
          创建
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="button" @click="close">关闭</button>
    </form>
  </dialog>

  <!-- 扩展选择弹窗（嵌套 dialog，确定后回填表单 selectedSkills） -->
  <ExtensionPickerModal
    ref="skillPicker"
    :selected="form.selectedSkills"
    @confirm="form.confirmSkills"
  />
</template>
