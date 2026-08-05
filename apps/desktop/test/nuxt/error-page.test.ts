import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NuxtError } from '#app'

const mocks = vi.hoisted(() => ({ clearError: vi.fn() }))

mockNuxtImport('clearError', () => mocks.clearError)

import ErrorPage from '~/error.vue'

/**
 * 全局错误页测试
 * 覆盖：状态码/文案渲染、默认文案兜底、两个出口按钮的 clearError redirect
 */
function mountError(error: Partial<NuxtError>) {
  return mount(ErrorPage, { props: { error: error as NuxtError } })
}

describe('ErrorPage 渲染', () => {
  it('渲染状态码与错误信息', () => {
    const wrapper = mountError({ status: 500, message: 'Internal Server Error' })
    expect(wrapper.find('h1').text()).toBe('500')
    expect(wrapper.find('p').text()).toContain('Internal Server Error')
  })

  it('message 缺失时显示默认文案', () => {
    const wrapper = mountError({ status: 404 })
    expect(wrapper.find('p').text()).toBe('页面加载时出现问题')
  })

  it('渲染两个操作按钮', () => {
    const wrapper = mountError({ status: 500 })
    expect(wrapper.text()).toContain('返回登录页')
    expect(wrapper.text()).toContain('返回首页')
  })
})

describe('ErrorPage 出口', () => {
  beforeEach(() => {
    mocks.clearError.mockClear()
  })

  it('点击"返回登录页"跳转 /auth（不依赖登录态）', async () => {
    const wrapper = mountError({ status: 500 })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(mocks.clearError).toHaveBeenCalledWith({ redirect: '/auth' })
  })

  it('点击"返回首页"跳转 /（经守卫处理）', async () => {
    const wrapper = mountError({ status: 500 })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(mocks.clearError).toHaveBeenCalledWith({ redirect: '/' })
  })
})
