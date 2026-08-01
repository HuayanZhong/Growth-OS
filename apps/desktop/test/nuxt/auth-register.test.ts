import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RegisterForm from '~/components/auth/register.vue'

/**
 * 注册表单组件测试
 * 覆盖：表单结构（无 SSO）、zod 字段级校验（不交叉）、提交时强制校验、切换事件
 */
function mountRegister() {
  return mount(RegisterForm)
}

/** 读取两个字段的校验错误文本 */
function errorTexts(wrapper: ReturnType<typeof mountRegister>) {
  return wrapper.findAll('.text-error').map((el) => el.text())
}

describe('RegisterForm 渲染结构', () => {
  it('渲染标题、邮箱、密码与注册按钮', () => {
    const wrapper = mountRegister()
    expect(wrapper.find('h1').text()).toBe('创建账号')
    expect(wrapper.find('input[type=email]').exists()).toBe(true)
    expect(wrapper.find('input[type=password]').exists()).toBe(true)
    expect(wrapper.find('button[type=submit]').text()).toContain('注 册')
  })

  it('注册表单不包含 SSO 登录按钮（SSO 只保留在登录表单）', () => {
    const wrapper = mountRegister()
    expect(wrapper.text()).not.toContain('QQ 登录')
    expect(wrapper.text()).not.toContain('微信登录')
  })

  it('初始未输入时不显示任何校验错误', () => {
    const wrapper = mountRegister()
    expect(errorTexts(wrapper)).toEqual(['', ''])
  })
})

describe('RegisterForm zod 字段级校验', () => {
  it('输入非法邮箱只提示邮箱错误，密码不受影响（互不交叉）', async () => {
    const wrapper = mountRegister()
    await wrapper.find('input[type=email]').setValue('abc')
    expect(errorTexts(wrapper)).toEqual(['请输入有效的邮箱地址', ''])
  })

  it('合法邮箱 + 短密码只提示密码错误', async () => {
    const wrapper = mountRegister()
    await wrapper.find('input[type=email]').setValue('user@example.com')
    await wrapper.find('input[type=password]').setValue('123')
    expect(errorTexts(wrapper)).toEqual(['', '密码至少 8 位'])
  })

  it('全部合法后错误提示清空', async () => {
    const wrapper = mountRegister()
    await wrapper.find('input[type=email]').setValue('user@example.com')
    await wrapper.find('input[type=password]').setValue('password123')
    expect(errorTexts(wrapper)).toEqual(['', ''])
  })
})

describe('RegisterForm 提交校验', () => {
  it('提交空表单强制校验并显示两个字段错误', async () => {
    const wrapper = mountRegister()
    await wrapper.find('form').trigger('submit')
    expect(errorTexts(wrapper)).toEqual(['请输入有效的邮箱地址', '密码至少 8 位'])
  })

  it('校验失败时不触发提交（submitting 保持 false）', async () => {
    const wrapper = mountRegister()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.loading').exists()).toBe(false)
  })
})

describe('RegisterForm 切换事件', () => {
  it('点击"立即登录"触发 switchToLogin 事件', async () => {
    const wrapper = mountRegister()
    await wrapper.find('button.btn-link').trigger('click')
    expect(wrapper.emitted('switchToLogin')).toHaveLength(1)
  })
})
