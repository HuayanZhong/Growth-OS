export type ToastType = 'info' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

// 模块级单例：ssr:false 仅浏览器运行，全局共享 toast 队列
const toasts = ref<ToastItem[]>([])
let nextId = 0

/**
 * 全局 toast 提示。
 * showToast 触发后默认 3s 自动移除；duration=0 表示常驻（需手动 removeToast）。
 */
export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, showToast, removeToast }
}
