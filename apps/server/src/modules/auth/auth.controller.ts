import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import { ApiDataOk, ApiErrorResponses } from '../../common/openapi/schema.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'

/**
 * 受保护探针端点：GET /api/v1/auth/me
 * M1 验收用——无 token 401 信封 / 有效 token 200 返回当前用户。
 * 后续会话等 auth 域路由也挂这里。
 */
@ApiTags('auth')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户（JWT 保护）' })
  @ApiDataOk(
    {
      type: 'object',
      properties: {
        id: { type: 'string', description: '用户 UUID（JWT sub）' },
        email: { type: 'string', description: '邮箱（隐私脱敏后可能缺省）' },
      },
      required: ['id'],
    },
    '当前用户',
  )
  me(@CurrentUser() user: AuthenticatedUser): { id: string; email?: string } {
    return user.email === undefined ? { id: user.id } : { id: user.id, email: user.email }
  }
}
