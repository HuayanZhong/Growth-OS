import { CallHandler, ExecutionContext } from '@nestjs/common'
import { of } from 'rxjs'
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor.ts'

function createContext(statusCode = 200) {
  const res = { statusCode }
  return {
    switchToHttp: () => ({
      getResponse: () => res,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext
}

function createCallHandler(data: unknown = 'test-data') {
  return { handle: () => of(data) } as unknown as CallHandler
}

describe('ResponseEnvelopeInterceptor', () => {
  it('正常响应包装为 { data: T }', async () => {
    const interceptor = new ResponseEnvelopeInterceptor()
    const result = await interceptor
      .intercept(createContext(200), createCallHandler('hello'))
      .toPromise()

    expect(result).toEqual({ data: 'hello' })
  })

  it('204 NoContent 不包装，直接透传', async () => {
    const interceptor = new ResponseEnvelopeInterceptor()
    const result = await interceptor
      .intercept(createContext(204), createCallHandler(null))
      .toPromise()

    expect(result).toBeNull()
  })

  it('null 返回值正确包装', async () => {
    const interceptor = new ResponseEnvelopeInterceptor()
    const result = await interceptor
      .intercept(createContext(200), createCallHandler(null))
      .toPromise()

    expect(result).toEqual({ data: null })
  })

  it('对象返回值正确包装', async () => {
    const interceptor = new ResponseEnvelopeInterceptor()
    const payload = { id: '1', name: 'test' }
    const result = await interceptor
      .intercept(createContext(200), createCallHandler(payload))
      .toPromise()

    expect(result).toEqual({ data: payload })
  })
})
