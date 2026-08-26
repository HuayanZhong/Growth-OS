import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Request, Response } from 'express'
import { Logger } from 'nestjs-pino'
import type { ApiErrorEnvelope } from '@growth-os/types'

/**
 * HTTP 状态码 → 机器可读错误码映射。
 * 未收录的状态码回退为 HTTP_<status>（如 502 → HTTP_502）。
 * 前端根据 code 字段做分支处理（而非解析 message 文案），
 * 所以 code 是契约的一部分，改动需前后端同步。
 */
const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.REQUEST_TIMEOUT]: 'TIMEOUT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
}

/**
 * 全局异常过滤器：所有未捕获异常统一归一化为 ApiErrorEnvelope { code, message, details? }。
 *
 * 设计要点：
 *   - 信封形态的 HttpException（如 ZodValidationPipe 抛出）原样透传，不二次包装。
 *   - 字符串/对象消息的 HttpException 映射为对应状态码的错误码。
 *   - 未知异常一律 500 + 固定文案「服务器内部错误」，不向客户端泄露堆栈/SQL 等内部细节。
 *   - 5xx 错误通过 nestjs-pino Logger 记录堆栈（自动携带 req.id，可与请求日志关联）。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const { status, body } = this.normalize(exception)

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }
    response.status(status).json(body)
  }

  private normalize(exception: unknown): { status: number; body: ApiErrorEnvelope } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()

      // 信封形态的对象响应（如 ZodValidationPipe 抛出 { code, message }）直接透传。
      // 额外校验 code/message 类型：防止 HttpException 的 response 恰好含同名非 string 属性时
      // 透传给客户端，违反 ApiErrorEnvelope 类型契约。
      if (
        typeof res === 'object' &&
        res !== null &&
        'code' in res &&
        'message' in res &&
        typeof (res as Record<string, unknown>).code === 'string' &&
        typeof (res as Record<string, unknown>).message === 'string'
      ) {
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

    // 未知异常（非 HttpException）：500 + 固定文案，不泄露内部信息
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    }
  }
}
