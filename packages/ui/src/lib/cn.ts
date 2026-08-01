import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并类名工具（shadcn 架构核心）：
 * - clsx：处理条件类名、数组、对象语法
 * - twMerge：解决 Tailwind 冲突类（后者覆盖前者），保留 daisyUI 组件类
 * 所有 UI 组件统一用 cn() 合并外部传入的 class，保证可覆盖性
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
