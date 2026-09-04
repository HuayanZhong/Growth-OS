import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from '../../../../src/components/ui/theme-toggle/ThemeToggle.vue'

describe('ThemeToggle', () => {
  const mountToggle = () => mount(ThemeToggle)

  it('渲染为 daisyUI swap 结构', () => {
    const wrapper = mountToggle()
    expect(wrapper.find('label.swap').exists()).toBe(true)
  })

  it('包含 theme-controller 复选框，value 为 dark', () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    expect(input.attributes('value')).toBe('dark')
  })

  it('默认未勾选（默认亮色主题）', () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    expect((input.element as HTMLInputElement).checked).toBe(false)
  })

  it('勾选后状态切换为暗色', async () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    await input.setValue()
    expect((input.element as HTMLInputElement).checked).toBe(true)
  })

  it('包含太阳（swap-off）与月亮（swap-on）两个图标', () => {
    const wrapper = mountToggle()
    expect(wrapper.find('svg.swap-off').exists()).toBe(true)
    expect(wrapper.find('svg.swap-on').exists()).toBe(true)
  })
})
