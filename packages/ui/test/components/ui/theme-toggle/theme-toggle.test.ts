import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ThemeToggle from '../../../../src/components/ui/theme-toggle/ThemeToggle.vue'

const STORAGE_KEY = 'growth-os-theme'

const mountToggle = () => mount(ThemeToggle)

describe('ThemeToggle', () => {
  beforeEach(() => {
    // 隔离：清空持久化与根节点主题，避免用例间串扰
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

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

  it('勾选后状态切换为暗色并写入 localStorage', async () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    await input.setValue()
    expect((input.element as HTMLInputElement).checked).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('取消勾选回亮色并记录 light', async () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    await input.setValue(true)
    await input.setValue(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('勾选切换时同步 <html> data-theme（暗设属性、亮移除交回默认）', async () => {
    const wrapper = mountToggle()
    const input = wrapper.get('input.theme-controller')
    await input.setValue(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
    await input.setValue(false)
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('挂载时从 localStorage 恢复暗色（刷新后保持主题）', async () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const wrapper = mountToggle()
    await wrapper.vm.$nextTick()
    const input = wrapper.get('input.theme-controller')
    expect((input.element as HTMLInputElement).checked).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('localStorage 记录为 light 时恢复亮色（不设 data-theme）', async () => {
    localStorage.setItem(STORAGE_KEY, 'light')
    const wrapper = mountToggle()
    await wrapper.vm.$nextTick()
    const input = wrapper.get('input.theme-controller')
    expect((input.element as HTMLInputElement).checked).toBe(false)
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('包含太阳（swap-off）与月亮（swap-on）两个图标', () => {
    const wrapper = mountToggle()
    expect(wrapper.find('svg.swap-off').exists()).toBe(true)
    expect(wrapper.find('svg.swap-on').exists()).toBe(true)
  })
})
