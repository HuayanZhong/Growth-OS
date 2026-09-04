import { describe, it, expect } from 'vitest'
import { loginSchema, registerSchema } from '../src/auth.ts'

describe('loginSchema', () => {
  it('合法凭证通过', () => {
    const input = { email: 'user@example.com', password: '12345678' }

    expect(loginSchema.parse(input)).toEqual(input)
  })

  it('非法邮箱失败', () => {
    expect(() => loginSchema.parse({ email: 'not-an-email', password: '12345678' })).toThrow()
  })

  it('密码不足 8 位失败', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com', password: '1234567' })).toThrow()
  })

  it('缺失字段失败', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com' })).toThrow()
    expect(() => loginSchema.parse({ password: '12345678' })).toThrow()
  })
})

describe('registerSchema', () => {
  it('当前与 loginSchema 同构（拆分字段时需同步更新）', () => {
    const valid = { email: 'user@example.com', password: '12345678' }

    expect(registerSchema.parse(valid)).toEqual(valid)
    expect(() => registerSchema.parse({ email: 'bad', password: 'short' })).toThrow()
  })
})
