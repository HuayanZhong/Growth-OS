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
  <div class="shrink-0 border-t border-base-200 bg-base-100 px-4 py-3 sm:px-6 sm:py-4">
    <div
      class="rounded-2xl border border-base-300 bg-base-100 shadow-sm transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-lg focus-within:shadow-primary/5"
    >
      <textarea
        v-model="model"
        name="chat-message"
        class="block w-full resize-none bg-transparent px-4 pb-1 pt-3 text-sm leading-relaxed text-base-content placeholder:text-base-content/40 focus:outline-none"
        placeholder="跟我聊聊你的想法，我可以帮你落地"
        rows="3"
        @keydown.enter.exact.prevent="handleSend"
      />
      <div class="flex items-center justify-between gap-2 px-2 pb-2">
        <div class="flex items-center gap-x-2">
          <details class="dropdown dropdown-top">
            <summary
              class="flex h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-2 text-xs text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
              title="选择模型"
            >
              Auto
              <svg
                class="size-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <ul
              class="dropdown-content z-20 mb-1 w-32 rounded-lg border border-base-300 bg-base-100 p-1 shadow-lg"
            >
              <li>
                <button
                  type="button"
                  class="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-base-200"
                >
                  Auto
                </button>
              </li>
            </ul>
          </details>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-base-content"
            title="上传附件"
          >
            <svg
              class="size-[1.2em]"
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
          class="btn btn-sm btn-dash text-base-content/60 hover:text-primary active:scale-95"
          :class="
            model.trim()
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-base-300 bg-base-100 text-base-content/40'
          "
          :disabled="!model.trim()"
          title="发送"
          @click="handleSend"
        >
          <svg
            class="size-[1.2em]"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path
              d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
            />
            <path d="m21.854 2.147-10.94 10.939" />
          </svg>
        </button>
      </div>
    </div>
    <p class="mt-2 text-center text-xs text-base-content/30">内容由 AI 生成，请谨慎甄别</p>
  </div>
</template>
