import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LoginForm from '~/components/auth/login.vue'

/**
 * 登录表单组件测试
 * 覆盖：表单结构（邮箱/密码/SSO）、zod 字段级校验（不交叉）、提交时强制校验、切换事件
 */
function mountLogin() {
  return mount(LoginForm)
}

/** 读取两个字段的校验错误文本 */
function errorTexts(wrapper: ReturnType<typeof mountLogin>) {
  return wrapper.findAll('.text-error').map((el) => el.text())
}

describe('LoginForm 渲染结构', () => {
  it('渲染标题、邮箱、密码与登录按钮', () => {
    const wrapper = mountLogin()
    expect(wrapper.find('h1').text()).toBe('欢迎回来')
    expect(wrapper.find('input[type=email]').exists()).toBe(true)
    expect(wrapper.find('input[type=password]').exists()).toBe(true)
    expect(wrapper.find('button[type=submit]').text()).toContain('登 录')
  })

  it('SSO 按钮（QQ/微信）只存在于登录表单', () => {
    const wrapper = mountLogin()
    expect(wrapper.text()).toContain('QQ 登录')
    expect(wrapper.text()).toContain('微信登录')
  })

  it('初始未输入时不显示任何校验错误', () => {
    const wrapper = mountLogin()
    expect(errorTexts(wrapper)).toEqual(['', ''])
  })
})

describe('LoginForm zod 字段级校验', () => {
  it('输入非法邮箱只提示邮箱错误，密码不受影响（互不交叉）', async () => {
    const wrapper = mountLogin()
    await wrapper.find('input[type=email]').setValue('abc')
    expect(errorTexts(wrapper)).toEqual(['请输入有效的邮箱地址', ''])
  })

  it('合法邮箱 + 短密码只提示密码错误', async () => {
    const wrapper = mountLogin()
    await wrapper.find('input[type=email]').setValue('user@example.com')
    await wrapper.find('input[type=password]').setValue('123')
    expect(errorTexts(wrapper)).toEqual(['', '密码至少 8 位'])
  })

  it('全部合法后错误提示清空', async () => {
    const wrapper = mountLogin()
    await wrapper.find('input[type=email]').setValue('user@example.com')
    await wrapper.find('input[type=password]').setValue('password123')
    expect(errorTexts(wrapper)).toEqual(['', ''])
  })

  it('输入合法值后再改回非法值，错误实时恢复', async () => {
    const wrapper = mountLogin()
    const email = wrapper.find('input[type=email]')
    await email.setValue('user@example.com')
    expect(errorTexts(wrapper)[0]).toBe('')
    await email.setValue('not-an-email')
    expect(errorTexts(wrapper)[0]).toBe('请输入有效的邮箱地址')
  })
})

describe('LoginForm 提交校验', () => {
  it('提交空表单强制校验并显示两个字段错误', async () => {
    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    expect(errorTexts(wrapper)).toEqual(['请输入有效的邮箱地址', '密码至少 8 位'])
  })

  it('校验失败时不触发提交（submitting 保持 false）', async () => {
    const wrapper = mountLogin()
    await wrapper.find('form').trigger('submit')
    // submitting 为 false 时按钮不显示 loading 态
    expect(wrapper.find('.loading').exists()).toBe(false)
  })
})

describe('LoginForm 切换事件', () => {
  it('点击"立即注册"触发 switchToRegister 事件', async () => {
    const wrapper = mountLogin()
    await wrapper.find('button.btn-link').trigger('click')
    expect(wrapper.emitted('switchToRegister')).toHaveLength(1)
  })
})
