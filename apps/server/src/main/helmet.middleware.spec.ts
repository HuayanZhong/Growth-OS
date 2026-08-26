import { helmetMiddleware } from './helmet.middleware.ts'

describe('helmetMiddleware', () => {
  it('返回 Express 中间件函数', () => {
    const middleware = helmetMiddleware()
    expect(typeof middleware).toBe('function')
  })
})
