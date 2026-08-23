import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mocks = vi.hoisted(() => ({ navigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => mocks.navigateTo)

import IndexPage from '~/pages/index.vue'

/**
 * 首页测试：入口重定向到默认智能体聊天页
 */
describe('首页重定向', () => {
  it('mount 后跳转 /dashboard/agents', async () => {
    await mount(IndexPage)
    await flushPromises()
    expect(mocks.navigateTo).toHaveBeenLastCalledWith('/dashboard/agents')
  })
})
