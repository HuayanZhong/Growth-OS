import { createParamDecorator } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import type { AuthenticatedUser, AuthenticatedRequest } from '../../shared/types/auth.types.ts'

/**
 * 注入当前请求用户：me(@CurrentUser() user: AuthenticatedUser)。
 * 前置条件：路由受 SupabaseJwtGuard 保护（非 @Public），否则 user 未挂载。
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return request.user
  },
)
