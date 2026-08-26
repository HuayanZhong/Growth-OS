import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.ts'
import type { AuthenticatedRequest } from '../../shared/types/auth.types.ts'
import { JwtVerifierService } from './jwt-verifier.service.ts'

/**
 * 全局鉴权守卫（默认拒绝原则）：
 * - 所有路由默认要求 Bearer token，公开能力必须显式 @Public()；
 * - 验证委托 JwtVerifierService（双轨：JWKS / Auth 服务器探针）；
 * - 通过后把身份挂到 request.user，供 @CurrentUser() 注入。
 * 注册方式见 auth.module.ts（APP_GUARD + useExisting，保持可覆写测试性）。
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const [scheme, token] = (request.headers.authorization ?? '').split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '未登录或登录已过期' })
    }
    const user = await this.verifier.verify(token)
    ;(request as AuthenticatedRequest).user = user
    return true
  }
}
