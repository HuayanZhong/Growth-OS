export type ToastType = 'info' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

// 模块级单例：ssr:false 仅浏览器运行，全局共享 toast 队列
const toasts = ref<ToastItem[]>([])
let nextId = 0
// 最大同时展示数：防刷屏，超出时顶掉最旧的（其离场动画由 ToastContainer 接管）
const MAX_TOASTS = 5

/**
 * 全局 toast 提示。
 * showToast 触发后默认 3s 自动移除；duration=0 表示常驻（需手动 removeToast）。
 * 同时最多展示 MAX_TOASTS 条，超出顶掉最旧的。
 */
export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    // 超出上限：移除最旧的，防止刷屏（被顶掉的 toast 若已有定时器，到期 no-op 无害）
    if (toasts.value.length > MAX_TOASTS) {
      toasts.value.shift()
    }
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, showToast, removeToast }
}
