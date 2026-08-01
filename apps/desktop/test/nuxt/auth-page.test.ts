import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AuthPage from '~/pages/auth/index.vue'

/**
 * 认证页（登录/注册 3D 翻转切换）测试
 *
 * GSAP 动画在测试环境无真实渲染，mock 为同步执行：
 * - timeline.to() 立即触发 onComplete（模式切换立即完成）
 * - fromTo 立即触发 onComplete（switching 锁立即释放）
 * 使切换逻辑（mode / switching 防连点锁）可被同步断言。
 */
vi.mock('gsap', () => {
  const gsapMock = {
    registerPlugin: vi.fn(),
    delayedCall: vi.fn(),
    timeline: vi.fn((vars: { onComplete?: () => void }) => {
      const tl = {
        to: vi.fn(() => {
          vars?.onComplete?.()
          return tl
        }),
      }
      return tl
    }),
    fromTo: vi.fn((_t: unknown, _from: unknown, vars: { onComplete?: () => void }) => {
      vars?.onComplete?.()
      return { kill: vi.fn() }
    }),
  }
  return { gsap: gsapMock }
})

vi.mock('gsap/CSSPlugin', () => ({ CSSPlugin: {} }))

// ThemeToggle 来自 @growth-os/ui，测试中仅需占位 stub
vi.mock('@growth-os/ui', () => ({
  ThemeToggle: { name: 'ThemeToggle', template: '<div data-test="theme-toggle" />' },
}))

describe('AuthPage 登录/注册切换', () => {
  it('初始渲染登录表单', () => {
    const wrapper = mount(AuthPage)
    expect(wrapper.text()).toContain('欢迎回来')
    expect(wrapper.text()).not.toContain('创建账号')
  })

  it('点击"立即注册"切换到注册表单', async () => {
    const wrapper = mount(AuthPage)
    await wrapper.find('button.btn-link').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('创建账号')
    expect(wrapper.text()).not.toContain('欢迎回来')
  })

  it('可从注册表单切回登录表单', async () => {
    const wrapper = mount(AuthPage)
    await wrapper.find('button.btn-link').trigger('click') // 立即注册
    await flushPromises()
    await wrapper.find('button.btn-link').trigger('click') // 立即登录
    await flushPromises()
    expect(wrapper.text()).toContain('欢迎回来')
    expect(wrapper.text()).not.toContain('创建账号')
  })

  it('快速连点两次只停留在目标表单（切换不产生状态错乱）', async () => {
    const wrapper = mount(AuthPage)
    const btn = wrapper.find('button.btn-link')
    await btn.trigger('click')
    await btn.trigger('click') // mode 已切换为 register，第二次点击应被忽略
    await flushPromises()
    expect(wrapper.text()).toContain('创建账号')
    expect(wrapper.text()).not.toContain('欢迎回来')
  })
})
