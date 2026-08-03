<script setup lang="ts">
import type { ToastType } from '~/composables/useToast'

const { toasts, removeToast } = useToast()

// daisyUI alert 语义色映射
const alertClass: Record<ToastType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}
</script>

<template>
  <!-- daisyUI toast：固定右上角堆叠，点击可关闭 -->
  <div class="toast toast-top toast-end z-100">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="alert cursor-pointer"
      :class="alertClass[t.type]"
      @click="removeToast(t.id)"
    >
      <span>{{ t.message }}</span>
    </div>
  </div>
</template>
