import { describe, it, expect } from 'vitest'
import { compressionMiddleware } from './compression.middleware.ts'

describe('compressionMiddleware', () => {
  it('返回 Express 中间件函数', () => {
    const middleware = compressionMiddleware()
    expect(typeof middleware).toBe('function')
  })
})
