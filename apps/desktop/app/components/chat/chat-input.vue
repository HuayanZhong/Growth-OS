<script setup lang="ts">
// 聊天底部输入区：daisyUI 组件（textarea / select / btn）
const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ send: [text: string] }>()

function handleSend() {
  const text = model.value.trim()
  if (!text) return
  emit('send', text)
  model.value = ''
}
</script>

<template>
  <div class="shrink-0 border-t border-base-200 bg-base-100">
    <div class="w-full px-6 py-4 sm:px-10">
      <div
        class="rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/5"
      >
        <textarea
          v-model="model"
          class="textarea textarea-ghost w-full resize-none px-4 pt-3 text-sm leading-relaxed focus:outline-none"
          placeholder="跟我聊聊你的想法，我可以帮你落地"
          rows="3"
          @keydown.enter.exact.prevent="handleSend"
        />
        <div class="flex items-center justify-between px-2 pb-2">
          <div class="flex items-center gap-1">
            <select class="select select-xs select-bordered border-base-300 text-base-content/60">
              <option value="">Auto</option>
            </select>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square text-base-content/50"
              title="上传附件"
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            class="btn btn-circle btn-primary btn-sm shadow-md shadow-primary/20 transition-transform duration-150 hover:scale-105 disabled:shadow-none"
            :disabled="!model.trim()"
            title="发送"
            @click="handleSend"
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
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
      </div>
      <p class="mt-2 text-center text-xs text-base-content/30">内容由 AI 生成，请谨慎甄别</p>
    </div>
  </div>
</template>
