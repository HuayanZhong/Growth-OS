import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of, timer } from 'rxjs'
import { TimeoutInterceptor } from '../../../src/common/interceptors/timeout.interceptor.ts'
import { SKIP_TIMEOUT } from '../../../src/common/decorators/skip-timeout.decorator.ts'

function createContext(metadata: Record<string, unknown> = {}) {
  const reflector = new Reflector()
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation(
    (metadataKey: unknown) => metadata[String(metadataKey)] ?? undefined,
  )
  const context = {
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
  } as unknown as ExecutionContext
  return { reflector, context }
}

function createCallHandler(result: unknown = 'ok') {
  return {
    handle: () => of(result),
  } as unknown as CallHandler
}

describe('TimeoutInterceptor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('正常响应直接透传，不触发超时', async () => {
    const { reflector, context } = createContext()
    const interceptor = new TimeoutInterceptor(reflector)
    const callHandler = createCallHandler('test-result')

    const result = await interceptor.intercept(context, callHandler).toPromise()

    expect(result).toBe('test-result')
  })

  it('@SkipTimeout 标记的端点跳过超时检查（SSE 流式用）', async () => {
    const { reflector, context } = createContext({ [SKIP_TIMEOUT]: true })
    const interceptor = new TimeoutInterceptor(reflector)
    const callHandler = createCallHandler('skipped')

    const result = await interceptor.intercept(context, callHandler).toPromise()

    expect(result).toBe('skipped')
  })

  it('慢响应（超过 30s 默认阈值）触发 RequestTimeoutException', async () => {
    const { reflector, context } = createContext()
    const interceptor = new TimeoutInterceptor(reflector)
    // 60s 才返回，但默认超时 30s
    const callHandler = {
      handle: () => timer(60_000),
    } as unknown as CallHandler

    const promise = interceptor.intercept(context, callHandler).toPromise()
    // 快进 30s 触发超时
    vi.advanceTimersByTime(30_000)

    await expect(promise).rejects.toThrow(RequestTimeoutException)
  })
})
