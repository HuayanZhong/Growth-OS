import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import type { ApiErrorEnvelope } from '@growth-os/types'

/** 常见 HTTP 状态 → 机器可读错误码；未收录的状态回退为 HTTP_<status> */
const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
}

/**
 * 全局异常过滤器：把一切异常归一化为 ApiErrorEnvelope（契约见 @growth-os/types）。
 * 业务代码抛 HttpException 时可直接携带信封对象，此处原样透传；
 * 未知异常一律 500 + 固定文案，不向客户端泄露内部细节。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const { status, body } = this.normalize(exception)

    this.logger.error(
      `${request.method} ${request.originalUrl} -> ${status} ${body.code}`,
      exception instanceof Error ? exception.stack : undefined,
    )
    response.status(status).json(body)
  }

  private normalize(exception: unknown): { status: number; body: ApiErrorEnvelope } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      // 信封形态的对象响应（如 ZodValidationPipe 抛出）直接透传
      if (typeof res === 'object' && res !== null && 'code' in res && 'message' in res) {
        return { status, body: res as ApiErrorEnvelope }
      }
      return {
        status,
        body: {
          code: STATUS_CODE_MAP[status] ?? `HTTP_${status}`,
          message:
            typeof res === 'string'
              ? res
              : typeof (res as { message?: unknown }).message === 'string'
                ? (res as { message: string }).message
                : exception.message,
        },
      }
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    }
  }
}
