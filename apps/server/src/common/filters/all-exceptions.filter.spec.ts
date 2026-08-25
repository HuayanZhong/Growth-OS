import { ArgumentsHost, BadRequestException, HttpStatus, Logger } from '@nestjs/common'
import type { ApiErrorEnvelope } from '@growth-os/types'
import { AllExceptionsFilter } from './all-exceptions.filter.ts'

function createHost() {
  const json = jest.fn()
  const status = jest.fn().mockReturnThis()
  const response = { status, json }
  const request = { method: 'GET', originalUrl: '/api/v1/demo' }
  // 只实现过滤器用到的 switchToHttp 分支
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost
  return { host, status, json }
}

describe('AllExceptionsFilter', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('信封形态的 HttpException 原样透传（状态码保留）', () => {
    const { host, status, json } = createHost()
    const envelope: ApiErrorEnvelope = { code: 'VALIDATION_ERROR', message: '请求参数校验失败' }

    new AllExceptionsFilter().catch(new BadRequestException(envelope), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith(envelope)
  })

  it('字符串消息的 HttpException 映射为状态码对应的错误码', () => {
    const { host, status, json } = createHost()

    new AllExceptionsFilter().catch(new BadRequestException('参数错误'), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith({ code: 'BAD_REQUEST', message: '参数错误' })
  })

  it('未知异常归一化为 500 INTERNAL_ERROR，不泄露内部信息', () => {
    const { host, status, json } = createHost()

    new AllExceptionsFilter().catch(new Error('内部敏感堆栈'), host)

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: '服务器内部错误' })
  })
})
