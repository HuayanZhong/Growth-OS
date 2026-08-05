import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DefaultLayout from '~/layouts/default.vue'

/**
 * 默认布局测试：空壳布局仅透传 slot
 */
describe('default 布局', () => {
  it('渲染默认 slot 内容', () => {
    const wrapper = mount(DefaultLayout, { slots: { default: '<p>slot-content</p>' } })
    expect(wrapper.text()).toBe('slot-content')
  })
})
