import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'

/**
 * 受保护探针端点：GET /api/v1/auth/me
 * M1 验收用——无 token 401 信封 / 有效 token 200 返回当前用户。
 * 后续会话等 auth 域路由也挂这里。
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户（JWT 保护）' })
  @ApiOkResponse({ description: '当前用户，经响应信封包裹为 { data: { id, email? } }' })
  me(@CurrentUser() user: AuthenticatedUser): { id: string; email?: string } {
    return user.email === undefined ? { id: user.id } : { id: user.id, email: user.email }
  }
}
