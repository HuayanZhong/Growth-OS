<script setup lang="ts">
// 单条聊天消息：daisyUI chat 组件
// AI 消息 chat-start（带头像 + 浅色气泡）；用户消息 chat-end（主色渐变气泡，对标扣子）
import type { ChatMessage } from './types'

defineProps<{ message: ChatMessage }>()
</script>

<template>
  <div class="chat" :class="message.role === 'user' ? 'chat-end' : 'chat-start'">
    <div v-if="message.role === 'assistant'" class="chat-image avatar">
      <div
        class="w-8 rounded-full bg-linear-to-b from-primary to-secondary text-primary-content shadow-sm ring-2 ring-primary/10"
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
          <path d="M12 21v-9" />
          <path d="M12 12c-3.2 0-5.5-1.7-5.5-5 3.2 0 5.5 1.7 5.5 5Z" />
          <path d="M12 12c3.2 0 5.5-1.7 5.5-5-3.2 0-5.5 1.7-5.5 5Z" />
        </svg>
      </div>
    </div>
    <div
      class="chat-bubble max-w-[75%] whitespace-pre-wrap text-sm leading-relaxed"
      :class="
        message.role === 'assistant'
          ? 'rounded-2xl rounded-tl-md bg-base-200/70 text-base-content'
          : 'rounded-2xl rounded-br-md bg-linear-to-br from-primary to-primary/80 text-primary-content shadow-md shadow-primary/10'
      "
    >
      {{ message.content }}
    </div>
  </div>
</template>
