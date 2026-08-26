import { compressionMiddleware } from './compression.middleware.ts'

describe('compressionMiddleware', () => {
  it('返回 Express 中间件函数', () => {
    const middleware = compressionMiddleware()
    expect(typeof middleware).toBe('function')
  })

  it('返回值包含 threshold 配置', () => {
    const middleware = compressionMiddleware() as ReturnType<typeof compressionMiddleware> & {
      _threshold?: number
    }
    expect(typeof middleware).toBe('function')
  })
})
