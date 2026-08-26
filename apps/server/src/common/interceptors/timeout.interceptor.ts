import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, throwError } from 'rxjs'
import { catchError, timeout } from 'rxjs/operators'
import { SKIP_TIMEOUT } from '../decorators/skip-timeout.decorator.ts'

/** 默认超时 30s：覆盖绝大多数 REST 场景；SSE 流式端点通过 @SkipTimeout 豁免。 */
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * 请求超时拦截器。
 *
 * 问题背景：
 *   慢请求（LLM 流式响应卡死、DB 连接池耗尽、外部 API 无响应）会无限挂起，
 *   最终只能靠 TCP 层超时断开，客户端拿到的是模糊的 net::ERR_CONNECTION_RESET。
 *   加拦截器后，超时请求会收到明确的 408 Request Timeout + 机器可读错误码。
 *
 * 工作原理：
 *   1. Reflector 检查 controller 方法是否带 @SkipTimeout() 装饰器 → 是则直接放行。
 *   2. 否则对 handler 返回的 Observable 施加 rxjs timeout 操作符。
 *   3. 超时触发时，rxjs 抛出 TimeoutError，catchError 将其转为 NestJS 的 RequestTimeoutException，
 *      由 AllExceptionsFilter 统一转为 { code: 'HTTP_408', message: '请求超时...' }。
 *
 * 豁免场景：
 *   - SSE 流式端点（/ai/chat）：响应可持续数分钟，不能设固定超时 → @SkipTimeout()。
 *   - 未来文件上传等长耗时端点：同样用 @SkipTimeout() 或自定义超时值。
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipTimeout = this.reflector.getAllAndOverride<boolean>(SKIP_TIMEOUT, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skipTimeout) return next.handle()

    const timeoutMs =
      this.reflector.get<number>('timeoutMs', context.getHandler()) ?? DEFAULT_TIMEOUT_MS

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) =>
        err.name === 'TimeoutError'
          ? throwError(() => new RequestTimeoutException('请求超时，请稍后重试'))
          : throwError(() => err),
      ),
    )
  }
}
