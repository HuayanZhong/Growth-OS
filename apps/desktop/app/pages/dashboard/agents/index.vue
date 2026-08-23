<script setup lang="ts">
// AGENTS 页：智能体聊天视口（对标扣子 Coze）
// 布局分两块：主聊天视口（flex-1 占满内容区，消息流滚动）+ 底部输入区（固定视口底部）
import type { ChatMessage } from '~/components/chat/types'

const agentName = ref('小芽')
const draft = ref('')
const chatScrollEl = ref<HTMLElement | null>(null)

// 初始消息：AI 欢迎语
const messages = ref<ChatMessage[]>([
  {
    role: 'assistant',
    content: `你好！我是${agentName.value}，你的个人智能体。随时可以找我聊天，我会越聊越懂你。`,
  },
])

// 引导问题：点击填入输入框（对标扣子「你可以让我帮你」建议卡片）
const suggestions = [
  '帮我把这周的工作整理成待办清单',
  '根据我的知识库写一份周报',
  '解释一下什么是思维链（CoT）',
]

function useSuggestion(text: string) {
  draft.value = text
}

function onSend(text: string) {
  messages.value.push({ role: 'user', content: text })
  // 发送后滚动到底部
  nextTick(() => {
    chatScrollEl.value?.scrollTo({ top: chatScrollEl.value.scrollHeight, behavior: 'smooth' })
  })
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 主聊天视口：占满剩余空间，消息流滚动；顶部带品牌氛围渐变 -->
    <div
      ref="chatScrollEl"
      class="flex-1 overflow-y-auto bg-linear-to-b from-primary/5 to-transparent"
    >
      <div class="flex w-full flex-col gap-5 px-6 py-8 sm:px-10">
        <ChatMessageItem v-for="(msg, i) in messages" :key="i" :message="msg" />

        <!-- 引导问题卡片（仅对话为空时展示） -->
        <ChatSuggestions
          v-if="messages.length === 1"
          :suggestions="suggestions"
          @select="useSuggestion"
        />

        <!-- 今天分隔符 -->
        <div class="divider my-1 text-xs text-base-content/30">今天</div>
      </div>
    </div>

    <ChatInput v-model="draft" @send="onSend" />
  </div>
</template>
