<script setup lang="ts">
// 单条聊天消息：daisyUI chat 组件
// AI 消息 chat-start（带头像 + 浅色气泡）；用户消息 chat-end（主色渐变气泡，对标扣子）
// 进入动画：挂载时 GSAP fromTo（用户消息自右侧滑入，AI 消息自下方上浮），只动 transform/opacity（animation.md）
import type { ChatMessage } from './types'
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'

// 显式注册 CSSPlugin：Vite 预打包 tree-shake 会移除 gsap 自动注册（sideEffects:false）
gsap.registerPlugin(CSSPlugin)

const props = defineProps<{ message: ChatMessage }>()

const rootEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const el = rootEl.value
  if (!el) return
  // 用户消息从右侧滑入（x），AI 消息自下方上浮（y）；起始值首帧应用避免闪烁
  const fromX = props.message.role === 'user' ? 24 : 0
  gsap.fromTo(
    el,
    { opacity: 0, x: fromX, y: props.message.role === 'user' ? 0 : 12 },
    {
      opacity: 1,
      x: 0,
      y: 0,
      duration: 0.32,
      ease: 'power2.out',
      // 清理残留 transform/opacity，避免影响后续导航
      clearProps: 'transform,opacity',
    },
  )
})
</script>

<template>
  <div ref="rootEl" class="chat" :class="message.role === 'user' ? 'chat-end' : 'chat-start'">
    <div v-if="message.role === 'assistant'" class="chat-image avatar self-start">
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
      class="chat-bubble max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed sm:max-w-[75%]"
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
