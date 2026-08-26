import { CallHandler, ExecutionContext, RequestTimeoutException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of, timer } from 'rxjs'
import { TimeoutInterceptor } from './timeout.interceptor.ts'
import { SKIP_TIMEOUT } from '../decorators/skip-timeout.decorator.ts'

function createContext(metadata: Record<string, unknown> = {}) {
  const reflector = new Reflector()
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((metadataKey: unknown) => metadata[String(metadataKey)] ?? undefined)
  const context = {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext
  return { reflector, context }
}

function createCallHandler(result: unknown = 'ok') {
  return {
    handle: () => of(result),
  } as unknown as CallHandler
}

describe('TimeoutInterceptor', () => {
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

  it('慢响应（超过超时阈值）触发 RequestTimeoutException', async () => {
    const { reflector, context } = createContext()
    jest.spyOn(reflector, 'get').mockReturnValue(1)
    const interceptor = new TimeoutInterceptor(reflector)
    const callHandler = {
      handle: () => timer(100),
    } as unknown as CallHandler

    await expect(interceptor.intercept(context, callHandler).toPromise()).rejects.toThrow(
      RequestTimeoutException,
    )
  })
})
