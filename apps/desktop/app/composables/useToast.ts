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
// 自动移除定时器集中管理：顶掉/手动移除时立即清除，避免过期回调对已移除 id 做无谓操作
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * 全局 toast 提示。
 * showToast 触发后默认 3s 自动移除；duration=0 表示常驻（需手动 removeToast）。
 * 同时最多展示 MAX_TOASTS 条，超出顶掉最旧的。
 */
export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    // 超出上限：移除最旧并清除其定时器（防止过期回调触发无意义的 filter 重赋值）
    if (toasts.value.length > MAX_TOASTS) {
      const removed = toasts.value.shift()
      if (removed) {
        clearToastTimer(removed.id)
      }
    }
    if (duration > 0) {
      timers.set(
        id,
        setTimeout(() => removeToast(id), duration),
      )
    }
  }

  function removeToast(id: number) {
    clearToastTimer(id)
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  // 清除指定 id 的自动移除定时器（幂等：已触发/已清除时静默跳过）
  function clearToastTimer(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  return { toasts, showToast, removeToast }
}
