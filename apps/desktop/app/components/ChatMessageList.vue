<script setup lang="ts">
// 会话消息流：只读渲染 props.messages（状态源在 useAgentChat，本组件不持状态）；
// 每条消息带身份行（头像 + 名字，agent 加 AI 徽章），消息体在灰色气泡内、靠左缩进（Coze 同型）；
// agent 头像为 EmotionBall（目录 emotion 驱动），用户头像为邮箱首字符圆形（与侧边栏同源）；
// typing 占位渲染 daisyUI loading-dots（纯 CSS 动画，符合动画规则第 2 条）；
// 列表顶部居中渲染「对话由AI生成」声明与日期分割线（首条消息时间，Coze 同型）；
// 消息数变化时滚动到底部（新消息即时可见）
import { getAgent } from '~/composables/useAgents'
import { formatChatDate } from '~/utils/chat'
import type { ChatMessage } from '~/types/chat'

const props = defineProps<{ messages: ChatMessage[]; agentSlug: string; userName?: string }>()

// agent 头像形象由目录 emotion 字段驱动（与开场页问候语同一来源）
const agent = computed(() => getAgent(props.agentSlug))

// 用户头像首字符（与侧边栏 initials 同口径：邮箱首字符大写）
const userInitial = computed(() => (props.userName?.[0] ?? '我').toUpperCase())

// 日期分割线：取首条消息时间（静态态会话内同天，一条分割线）
const dateLabel = computed(() => {
  const first = props.messages[0]
  return first ? formatChatDate(first.createdAt) : ''
})

// 滚动容器：挂载（重进已有会话）与消息追加后都滚到底部（nextTick 等 DOM 就绪）
const scrollRef = ref<HTMLElement | null>(null)
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { immediate: true },
)
</script>

<template>
  <!-- 水平内边距由页面根容器统一提供（消息列与停靠输入区左缘对齐），这里只管纵向 -->
  <div ref="scrollRef" class="min-h-0 flex-1 overflow-y-auto py-6">
    <!-- 顶部元信息：AI 生成声明 + 日期分割线（随消息滚动，Coze 同型） -->
    <div v-if="messages.length" class="mb-8 flex flex-col items-center gap-4">
      <p class="text-xs text-base-content/40">对话由AI生成</p>
      <p data-test="date-divider" class="text-xs text-base-content/40">{{ dateLabel }}</p>
    </div>

    <!-- 消息列：与停靠输入区同宽同左缘（不做居中限宽，Coze 同型） -->
    <div class="flex w-full flex-col gap-6">
      <div v-for="message in messages" :key="message.id" class="flex flex-col gap-1.5">
        <!-- 身份行：头像 + 名字（agent 加 AI 徽章） -->
        <div class="flex items-center gap-2">
          <span class="h-7 w-7 shrink-0">
            <EmotionBall
              v-if="message.role === 'agent'"
              :emotion="agent?.emotion"
              :color="agent?.color"
            />
            <span
              v-else
              data-test="user-avatar"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary"
            >
              {{ userInitial }}
            </span>
          </span>
          <span class="max-w-48 truncate text-sm text-base-content/70">
            {{ message.role === 'agent' ? (agent?.name ?? 'Agent') : (userName ?? '我') }}
          </span>
          <span
            v-if="message.role === 'agent'"
            data-test="ai-badge"
            class="rounded bg-base-300/70 px-1.5 py-0.5 text-xs leading-none text-base-content/50"
          >
            AI
          </span>
        </div>

        <!-- 消息体：缩进对齐身份行文字 -->
        <div class="pl-9">
          <div
            v-if="message.kind === 'typing'"
            data-test="typing-indicator"
            class="flex w-fit items-center rounded-2xl rounded-tl-sm bg-base-200/70 px-4 py-3"
          >
            <span class="loading loading-dots loading-sm text-base-content/50" />
          </div>
          <div
            v-else
            class="w-fit max-w-full rounded-2xl rounded-tl-sm bg-base-200/70 px-4 py-3 leading-relaxed"
            :class="message.role === 'user' ? 'bg-base-200' : ''"
          >
            {{ message.text }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
