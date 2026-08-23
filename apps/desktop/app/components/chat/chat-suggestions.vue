<script setup lang="ts">
// 引导问题卡片：对话为空时展示，以 AI 消息气泡形式呈现（对标扣子「你可以让我帮你」）
defineProps<{ suggestions: string[] }>()
const emit = defineEmits<{ select: [text: string] }>()
</script>

<template>
  <div class="chat chat-start">
    <div class="chat-image avatar">
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
    <div class="chat-bubble max-w-[75%] rounded-2xl rounded-tl-md bg-base-200/70 text-base-content">
      <p class="mb-3 text-sm font-medium text-base-content/50">你可以让我帮你</p>
      <div class="flex flex-col gap-2">
        <button
          v-for="s in suggestions"
          :key="s"
          type="button"
          class="group flex items-center gap-2.5 rounded-xl border border-base-300/80 bg-base-100 px-4 py-2.5 text-left text-sm text-base-content/75 transition-all duration-150 hover:border-primary/40 hover:bg-base-100 hover:text-primary"
          @click="emit('select', s)"
        >
          <svg
            class="h-4 w-4 shrink-0 text-primary/50 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          {{ s }}
        </button>
      </div>
    </div>
  </div>
</template>
