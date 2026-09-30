<script setup lang="ts">
// 任务输入组件：输入卡片 + 垫层 Agent 选择条（新任务页与 Agent 开场页共用，保持布局对齐）
// 下拉即 Agent 目录（useAgents 响应式单例）：选择即路由切换（/dashboard/agents/:slug），
// 当前 Agent 高亮；各 Agent 小球头像由目录的 emotion 字段驱动
// 模型选择为 Auto（默认）+ DeepSeek 手动档（目录 utils/models）：Auto 由服务端按请求内容路由，
// 手动档携带注册表 modelId 优先于 Auto 路由
// showAgentSelector：会话（chat）态不渲染垫层（对标 Coze：切 agent 走侧边栏），开场/新任务页默认显示
// 图片附件：Ctrl+V 粘贴剪贴板图片与 + 按钮文件选择同路（压缩管线 utils/image-compress），
// 附件卡片呈现在输入卡片内部顶部（缩略图/文件名/格式标签/删除），发送时随文本一起 emit
import { getAgent, useAgents } from '~/composables/useAgents'
import { compressImageFile } from '~/utils/image-compress'
import type { ImageRejectReason } from '~/utils/image-compress'

const props = withDefaults(
  defineProps<{
    agentName?: string
    placeholder?: string
    agentSlug?: string
    showAgentSelector?: boolean
    /** 回复生成中：发送按钮变停止按钮，Enter 不再发送 */
    generating?: boolean
  }>(),
  {
    agentName: '小花颜',
    placeholder: '说说你想做什么…',
    agentSlug: undefined,
    showAgentSelector: true,
    generating: false,
  },
)

const { agents } = useAgents()
const { showToast } = useToast()

// 触发器小球显示当前 Agent 的形象；slug 未传或未命中时由 EmotionBall 默认表情兜底
const currentAgent = computed(() => (props.agentSlug ? getAgent(props.agentSlug) : undefined))

const emit = defineEmits<{
  send: [text: string, images: string[], modelId?: string]
  stop: []
  /** 模型切换（含重复选择；分割线去重归会话侧） */
  'model-change': [modelId: string, label: string]
}>()

// 输入草稿：发送按钮随内容或附件启用，空内容且无附件禁用
const draft = ref('')

const canSend = computed(() => draft.value.trim().length > 0 || attachments.value.length > 0)

// —— 图片附件（Coze 同型：卡片呈现在输入卡片内部顶部）——

interface Attachment {
  id: string
  dataUrl: string
  name: string
  format: string
}

const MAX_ATTACHMENTS = 4
const attachments = ref<Attachment[]>([])
let attachmentSeq = 0
const fileInputRef = ref<HTMLInputElement | null>(null)

const REJECT_MESSAGES: Record<ImageRejectReason, string> = {
  unsupported_type: '仅支持 JPEG/PNG/GIF/WebP 图片',
  too_large: '图片超过 25MB，请压缩后再试',
  undecodable: '图片无法识别',
  compress_failed: '图片处理失败，请重试',
}

async function addAttachments(files: File[]): Promise<void> {
  for (const file of files) {
    if (attachments.value.length >= MAX_ATTACHMENTS) {
      showToast(`最多添加 ${MAX_ATTACHMENTS} 张图片`, 'error')
      return
    }
    const result = await compressImageFile(file)
    if (!result.ok) {
      showToast(REJECT_MESSAGES[result.reason], 'error')
      continue
    }
    attachmentSeq += 1
    attachments.value.push({
      id: `att-${attachmentSeq}`,
      dataUrl: result.dataUrl,
      name: file.name || result.name,
      format: 'JPEG',
    })
  }
}

// 粘贴：仅拦截图片项走附件管线，文本粘贴不受影响
function onPaste(event: ClipboardEvent): void {
  const files: File[] = []
  for (const item of event.clipboardData?.items ?? []) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length === 0) return
  event.preventDefault()
  void addAttachments(files)
}

function openFilePicker(): void {
  fileInputRef.value?.click()
}

function onFileChosen(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files?.length) void addAttachments([...input.files])
  input.value = ''
}

function removeAttachment(id: string): void {
  attachments.value = attachments.value.filter((attachment) => attachment.id !== id)
}

function send() {
  // 生成中不接受新发送：回复按序完成，消息顺序不乱（停止走 stop 事件）
  if (props.generating || !canSend.value) return
  // Auto 档不携带 modelId（服务端按请求内容路由）；手动档透传注册表 id
  const modelId =
    selectedModel.value && selectedModel.value.id !== 'auto' ? selectedModel.value.id : undefined
  emit(
    'send',
    draft.value.trim(),
    attachments.value.map((attachment) => attachment.dataUrl),
    modelId,
  )
  draft.value = ''
  attachments.value = []
}

function onAction() {
  if (props.generating) emit('stop')
  else send()
}

// 当前选中模型：Auto（默认，服务端按请求内容路由）或 DeepSeek 手动档（透传注册表 id）
const selectedModel = ref<ModelEntry | undefined>(MODEL_LIST.find((model) => model.isDefault))

// 模型选择：同款不 emit（避免噪音），切换即上报（分割线插否由会话侧去重）
function selectModel(model: ModelEntry): void {
  if (selectedModel.value?.id === model.id) return
  selectedModel.value = model
  emit('model-change', model.id, model.name)
}

// 两个弹层共用容器/条目样式：与输入卡片同一套投影语言，选中态用对勾而非色块
const menuClass =
  'dropdown-content z-20 mt-1 w-52 rounded-xl border border-base-300/60 bg-base-100 p-1 shadow-xl shadow-base-content/5'
const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-base-content/80 transition-colors hover:bg-base-content/5'
</script>

<template>
  <!-- 宽度策略归使用方：组件只撑满父容器（开场页 max-w-3xl 居中 / 会话态撑满钉底由页面控制） -->
  <div class="w-full">
    <!-- 输入卡片（顶层）：纵向渐变面 + 大而软的投影，悬浮在垫层之上 -->
    <div
      class="relative z-10 rounded-3xl border border-base-300 bg-linear-to-b from-base-100 to-base-200 shadow-xl shadow-base-content/5"
    >
      <!-- 附件卡片行（Coze 同型：输入框内部顶部，先于文本区） -->
      <div v-if="attachments.length" class="flex flex-wrap gap-2 px-4 pt-3">
        <div
          v-for="attachment in attachments"
          :key="attachment.id"
          data-test="composer-attachment"
          class="flex w-44 items-center gap-2 rounded-xl border border-base-300 bg-base-100 p-1.5"
        >
          <img
            :src="attachment.dataUrl"
            class="h-10 w-10 shrink-0 rounded-lg object-cover"
            alt="附件图片"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs text-base-content/80">{{ attachment.name }}</p>
            <p class="text-[10px] uppercase leading-tight text-base-content/40">
              {{ attachment.format }}
            </p>
          </div>
          <button
            type="button"
            data-test="attachment-remove"
            class="btn btn-circle btn-ghost btn-xs text-base-content/50"
            title="移除附件"
            @click="removeAttachment(attachment.id)"
          >
            <svg
              class="h-3.5 w-3.5"
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
      </div>

      <textarea
        v-model="draft"
        class="h-24 w-full resize-none bg-transparent px-4 pt-4 leading-relaxed focus:outline-none"
        :placeholder="placeholder"
        data-test="composer-input"
        @keydown.enter.exact.prevent="send"
        @paste="onPaste"
      />
      <div class="flex items-center justify-between px-3 pb-3">
        <div class="flex items-center gap-0.5">
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-sm"
            title="添加附件"
            data-test="composer-attach"
            @click="openFilePicker"
          >
            <svg
              class="h-5 w-5"
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
          <!-- 文件选择器（与粘贴殊途同归）；accept 锁白名单格式 -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            class="hidden"
            data-test="composer-file-input"
            @change="onFileChosen"
          />

          <!-- 模型选择：Auto 单档（实际模型由服务端按请求内容路由） -->
          <div class="dropdown dropdown-top dropdown-start">
            <div
              tabindex="0"
              role="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-base-content/60"
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
                <rect x="5" y="5" width="14" height="14" rx="2" />
                <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
                <path d="M9 2v3" />
                <path d="M15 2v3" />
                <path d="M9 19v3" />
                <path d="M15 19v3" />
                <path d="M2 9h3" />
                <path d="M2 15h3" />
                <path d="M19 9h3" />
                <path d="M19 15h3" />
              </svg>
              <span>{{ selectedModel?.name ?? '选择模型' }}</span>
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <ul :class="menuClass" tabindex="0">
              <li v-for="model in MODEL_LIST" :key="model.id">
                <button type="button" :class="menuItemClass" @click="selectModel(model)">
                  <span
                    class="flex-1 text-left"
                    :class="model.id === selectedModel?.id ? 'font-medium text-base-content' : ''"
                  >
                    {{ model.name }}
                  </span>
                  <span v-if="model.isDefault" class="text-xs text-base-content/40">默认</span>
                  <svg
                    v-if="model.id === selectedModel?.id"
                    class="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- 生成中：发送按钮变停止按钮（方块，描边样式）；空闲：发送（上箭头，主题色） -->
        <button
          type="button"
          data-test="composer-action"
          class="btn btn-circle btn-sm"
          :class="
            props.generating
              ? 'border border-base-300 bg-base-100 text-base-content/70 hover:bg-base-200'
              : 'btn-primary text-primary-content'
          "
          :disabled="!props.generating && !canSend"
          :title="props.generating ? '停止生成' : '发送'"
          @click="onAction"
        >
          <svg v-if="props.generating" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="7" y="7" width="10" height="10" rx="2" />
          </svg>
          <svg
            v-else
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 垫层（底层）：缩进更多、圆角更小、颜色更深（近大远小），上沿压入卡片底下，带接地投影；
         pt 需补偿被卡片压住的部分（-mt-4 = 16px），可见区上下各 4px 使触发器垂直居中且总高不变；
         会话（chat）态经 showAgentSelector=false 关闭（切 agent 走侧边栏） -->
    <div
      v-if="props.showAgentSelector"
      class="-mt-4 mx-6 rounded-b-xl border border-t-0 border-base-300 bg-base-300/60 px-2 pb-1 pt-4 shadow-md shadow-base-content/5"
    >
      <div class="dropdown dropdown-top dropdown-start">
        <div
          tabindex="0"
          role="button"
          class="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-base-content/80"
        >
          <span class="h-5 w-5 shrink-0">
            <EmotionBall :emotion="currentAgent?.emotion" :color="currentAgent?.color" />
          </span>
          <span>{{ props.agentName }}</span>
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <ul :class="menuClass" tabindex="0">
          <li v-for="agent in agents" :key="agent.slug">
            <NuxtLink :to="`/dashboard/agents/${agent.slug}`" :class="menuItemClass">
              <span class="h-5 w-5 shrink-0">
                <EmotionBall :emotion="agent.emotion" :color="agent.color" />
              </span>
              <span
                class="flex-1 text-left"
                :class="agent.slug === props.agentSlug ? 'font-medium text-base-content' : ''"
              >
                {{ agent.name }}
              </span>
              <span v-if="agent.isDefault" class="text-xs text-base-content/40">默认</span>
              <svg
                v-if="agent.slug === props.agentSlug"
                class="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
