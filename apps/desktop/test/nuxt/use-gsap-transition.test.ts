// useGsapTransition 单测：mock gsap 模块（mock.md——不跑真实 DOM 动画），断言
// 插件注册、参数透传/默认值合并、kill 先行、Promise 时序、归一化分支、scope 自动回收。
// 环境规则见 tests/environment.md：动态 import + vi.resetModules 让模块级注册每次重新执行。
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { effectScope } from 'vue'

const gsapMocks = vi.hoisted(() => ({
  registerPlugin: vi.fn(),
  fromTo: vi.fn(),
  to: vi.fn(),
  killTweensOf: vi.fn(),
}))

vi.mock('gsap', () => ({ gsap: gsapMocks }))
vi.mock('gsap/CSSPlugin', () => ({ CSSPlugin: { id: 'CSSPlugin' } }))

function makeTween() {
  return { kill: vi.fn() }
}

function makeEl() {
  return document.createElement('div')
}

async function importComposable() {
  vi.resetModules()
  const mod = await import('~/composables/useGsapTransition')
  return mod.useGsapTransition
}

beforeEach(() => {
  vi.clearAllMocks()
  gsapMocks.fromTo.mockImplementation(() => makeTween())
  gsapMocks.to.mockImplementation(() => makeTween())
})

describe('useGsapTransition', () => {
  it('模块导入时注册一次 CSSPlugin（幂等职责收拢到 composable）', async () => {
    await importComposable()
    expect(gsapMocks.registerPlugin).toHaveBeenCalledTimes(1)
    expect(gsapMocks.registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'CSSPlugin' }),
    )
  })

  describe('enter', () => {
    it('透传 from/to 并注入默认 clearProps（首帧起始值 + 残留清理）', async () => {
      const useGsapTransition = await importComposable()
      const { enter } = useGsapTransition()
      const el = makeEl()
      enter(el, { opacity: 0, x: 24 }, { opacity: 1, duration: 0.5 })
      expect(gsapMocks.fromTo).toHaveBeenCalledWith(
        el,
        { opacity: 0, x: 24 },
        { clearProps: 'transform,opacity', opacity: 1, duration: 0.5 },
      )
    })

    it('调用方显式 clearProps 覆盖默认值', async () => {
      const useGsapTransition = await importComposable()
      const { enter } = useGsapTransition()
      enter(makeEl(), { rotationY: 90 }, { rotationY: 0, clearProps: 'transform' })
      const toVars = gsapMocks.fromTo.mock.calls[0]?.[2] as Record<string, unknown>
      expect(toVars.clearProps).toBe('transform')
    })

    it('归一化失败（null 目标）时静默跳过', async () => {
      const useGsapTransition = await importComposable()
      const { enter } = useGsapTransition()
      expect(enter(null, {}, {})).toBeNull()
      expect(gsapMocks.fromTo).not.toHaveBeenCalled()
    })

    it('组件实例目标经 $el 归一化后作为动画目标', async () => {
      const useGsapTransition = await importComposable()
      const { enter } = useGsapTransition()
      const el = makeEl()
      enter({ $el: el }, {}, {})
      expect(gsapMocks.fromTo.mock.calls[0]?.[0]).toBe(el)
    })
  })

  describe('exit', () => {
    it('先杀同目标在飞 tween 再启动离场，onComplete 后 resolve', async () => {
      const useGsapTransition = await importComposable()
      const { exit } = useGsapTransition()
      const el = makeEl()
      const callerComplete = vi.fn()
      const pending = exit(el, { opacity: 0, onComplete: callerComplete })
      expect(gsapMocks.killTweensOf).toHaveBeenCalledWith(el)
      expect(gsapMocks.to).toHaveBeenCalled()
      const order = vi.mocked(gsapMocks.killTweensOf).mock.invocationCallOrder[0] ?? 0
      const toOrder = vi.mocked(gsapMocks.to).mock.invocationCallOrder[0] ?? 0
      expect(order).toBeGreaterThan(0)
      expect(order).toBeLessThan(toOrder)
      // onComplete 未执行前 promise 不 resolve
      let resolved = false
      void pending.then(() => {
        resolved = true
      })
      const toVars = gsapMocks.to.mock.calls[0]?.[1] as { onComplete?: () => void }
      toVars.onComplete?.()
      await pending
      expect(callerComplete).toHaveBeenCalled()
      expect(resolved).toBe(true)
    })

    it('目标缺失时直接 resolve（与登录页降级跳转路径对齐）', async () => {
      const useGsapTransition = await importComposable()
      const { exit } = useGsapTransition()
      await expect(exit(null)).resolves.toBeUndefined()
      expect(gsapMocks.to).not.toHaveBeenCalled()
    })
  })

  describe('normalizeTarget', () => {
    it('真实元素节点直接返回', async () => {
      const useGsapTransition = await importComposable()
      const { normalizeTarget } = useGsapTransition()
      const el = makeEl()
      expect(normalizeTarget(el)).toBe(el)
    })

    it('fragment 锚点（非元素节点）走 fallback 选择器从父容器取', async () => {
      const useGsapTransition = await importComposable()
      const { normalizeTarget } = useGsapTransition()
      const el = makeEl()
      const anchor = { nodeType: 3, parentElement: { querySelector: vi.fn(() => el) } }
      expect(normalizeTarget({ $el: anchor }, '.hero-content')).toBe(el)
      expect(anchor.parentElement.querySelector).toHaveBeenCalledWith('.hero-content')
    })

    it('非元素节点且未提供 fallback 时返回 null', async () => {
      const useGsapTransition = await importComposable()
      const { normalizeTarget } = useGsapTransition()
      expect(normalizeTarget({ $el: { nodeType: 3 } })).toBeNull()
    })
  })

  describe('lifecycle', () => {
    it('scope 销毁时杀掉本实例创建的全部 tween', async () => {
      const useGsapTransition = await importComposable()
      const tween = makeTween()
      gsapMocks.fromTo.mockImplementation(() => tween)
      const scope = effectScope()
      let captured: ReturnType<typeof useGsapTransition> | undefined
      scope.run(() => {
        captured = useGsapTransition()
      })
      captured?.enter(makeEl(), {}, {})
      expect(tween.kill).not.toHaveBeenCalled()
      scope.stop()
      expect(tween.kill).toHaveBeenCalledTimes(1)
    })

    it('kill() 显式杀掉本实例 tween；kill(target) 走 killTweensOf', async () => {
      const useGsapTransition = await importComposable()
      const tween = makeTween()
      gsapMocks.fromTo.mockImplementation(() => tween)
      const { enter, kill } = useGsapTransition()
      const el = makeEl()
      enter(el, {}, {})
      kill()
      expect(tween.kill).toHaveBeenCalledTimes(1)
      kill(el)
      expect(gsapMocks.killTweensOf).toHaveBeenCalledWith(el)
    })
  })
})
