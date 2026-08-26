import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'

/**
 * 成功响应信封拦截器：把 controller 返回值包装为 { data: T }。
 *
 * 设计决策：
 *   - 与错误路径对称：错误 → ApiErrorEnvelope { code, message, details? }，成功 → ApiResponse<T> { data }。
 *   - 前端可统一用 res.data 取业务数据，无需猜测返回值结构。
 *   - SSE 端点排除：流式响应由 controller 直接操作 res 对象（writeHead + write），
 *     不走拦截器的 next.handle() 返回值，天然不受影响。
 *   - NoContent (204) 排除：无响应体的端点包装 { data: null } 无意义。
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse()
    if (response.statusCode === 204) return next.handle()

    return next.handle().pipe(map((data) => ({ data })))
  }
}
