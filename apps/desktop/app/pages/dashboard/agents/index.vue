<script setup lang="ts">
// AGENTS 页：智能体列表（当前仅内置默认智能体）
</script>

<template>
  <div class="p-6">
    <h1 class="mb-4 text-2xl font-semibold">AGENTS</h1>
    <div class="divide-y divide-base-300 rounded-lg border border-base-300 bg-base-200">
      <div class="flex items-center gap-3 px-4 py-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-primary to-secondary text-primary-content"
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
            <path d="M12 21v-9" />
            <path d="M12 12c-3.2 0-5.5-1.7-5.5-5 3.2 0 5.5 1.7 5.5 5Z" />
            <path d="M12 12c3.2 0 5.5-1.7 5.5-5-3.2 0-5.5 1.7-5.5 5Z" />
          </svg>
        </span>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <span class="truncate font-medium">小芽</span>
          <span class="shrink-0 text-xs text-base-content/40">默认</span>
        </div>
      </div>
    </div>
  </div>
</template>
