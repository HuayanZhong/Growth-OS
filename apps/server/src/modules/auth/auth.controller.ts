import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'

/**
 * 受保护探针端点：GET /api/v1/auth/me
 * M1 验收用——无 token 401 信封 / 有效 token 200 返回当前用户。
 * 后续会话等 auth 域路由也挂这里。
 */
@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): { id: string; email?: string } {
    return user.email === undefined ? { id: user.id } : { id: user.id, email: user.email }
  }
}
