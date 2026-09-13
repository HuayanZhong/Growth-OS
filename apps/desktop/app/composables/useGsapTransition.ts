// GSAP 动画封装：集中动画规则（.trae/rules/frontend/styles/animation.md）的机械性样板——
// 插件注册、入场 fromTo（首帧应用起始值 + 完成清理残留）、离场（先杀在飞 tween，完成可 await）、
// $el fragment 锚点归一化、scope 销毁自动回收。规则是"为什么"，这里是"怎么做"。
import { getCurrentScope, onScopeDispose } from 'vue'
import { gsap } from 'gsap'
import { CSSPlugin } from 'gsap/CSSPlugin'

// 模块级注册一次（registerPlugin 幂等，HMR 重载安全）：Vite 预打包 tree-shake 会移除 gsap
// 的自动注册（sideEffects:false），不注册则 x/scale/rotationY/opacity 等 CSS 属性被忽略
gsap.registerPlugin(CSSPlugin)

/** 动画目标：真实元素、组件实例（取 $el）或 null；$el 可能是 fragment 锚点 */
export type MotionTarget = HTMLElement | { $el?: unknown } | null | undefined

/** 完成后清除的内联残留默认值（规则第 8 条）；调用方显式传入 clearProps 时以调用方为准 */
const DEFAULT_CLEAR_PROPS = 'transform,opacity'

/** 规则第 4 条：条件渲染组件的 $el 可能是 fragment 锚点（Text/注释节点），GSAP 对其抛
 *  "Missing plugin?" 且不写样式——命中元素节点直接返回，否则按 fallbackSelector 从父容器取 */
function normalizeTarget(target: MotionTarget, fallbackSelector?: string): HTMLElement | null {
  if (!target) return null
  const direct = target as Node
  const node: Node | null | undefined = direct.nodeType
    ? direct
    : ((target as { $el?: Node | null }).$el ?? null)
  if (node && node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement
  if (fallbackSelector) {
    return node?.parentElement?.querySelector<HTMLElement>(fallbackSelector) ?? null
  }
  return null
}

/**
 * GSAP 进出场动画入口。在组件 setup 上下文中调用可获得自动回收（卸载时杀掉本实例创建的 tween）。
 * - enter：入场 fromTo，首帧应用起始值防闪烁（规则第 9 条），默认完成后清理 transform/opacity 残留
 * - exit：离场 to——先杀同目标在飞 tween（防从半途重放），完成后 resolve（可 await 后再跳转/翻转），
 *   调用方自己的 onComplete 会先于 resolve 执行
 * - normalizeTarget：$el/锚点归一化为真实元素
 * - kill：显式终止（传目标杀该目标上的 tween；不传杀本实例创建的全部 tween）
 */
export function useGsapTransition() {
  const liveTweens = new Set<gsap.core.Tween>()
  if (getCurrentScope()) {
    onScopeDispose(() => {
      for (const tween of liveTweens) tween.kill()
      liveTweens.clear()
    })
  }

  function enter(target: MotionTarget, fromVars: gsap.TweenVars, toVars: gsap.TweenVars = {}) {
    const el = normalizeTarget(target)
    if (!el) return null
    const tween = gsap.fromTo(el, fromVars, { clearProps: DEFAULT_CLEAR_PROPS, ...toVars })
    liveTweens.add(tween)
    return tween
  }

  function exit(target: MotionTarget, toVars: gsap.TweenVars = {}): Promise<void> {
    const el = normalizeTarget(target)
    if (!el) return Promise.resolve()
    // 动画中途重复触发：先终止进行中的 tween，避免从半途重新缩放（ToastContainer 既有模式）
    gsap.killTweensOf(el)
    return new Promise((resolve) => {
      const callerComplete = toVars.onComplete
      const tween = gsap.to(el, {
        ...toVars,
        onComplete: () => {
          callerComplete?.()
          liveTweens.delete(tween)
          resolve()
        },
      })
      liveTweens.add(tween)
    })
  }

  function kill(target?: MotionTarget) {
    if (target) {
      const el = normalizeTarget(target)
      if (el) gsap.killTweensOf(el)
      return
    }
    for (const tween of liveTweens) tween.kill()
    liveTweens.clear()
  }

  return { enter, exit, normalizeTarget, kill }
}
