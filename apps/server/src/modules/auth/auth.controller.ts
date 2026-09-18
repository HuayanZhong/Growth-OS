import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { loginSchema } from '@growth-os/types'
import type { LoginInput, LoginResult } from '@growth-os/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import { Public } from '../../common/decorators/public.decorator.ts'
import { ApiDataOk, ApiErrorResponses, toOpenApiSchema } from '../../common/openapi/schema.ts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { AuthService } from './auth.service.ts'

/**
 * Auth 端点：
 * - GET /api/v1/auth/me —— 受保护探针（M1 验收用）：无 token 401 信封 / 有效 token 200 返回当前用户；
 * - POST /api/v1/auth/login —— 公开登录，代理 Supabase Auth password grant，供 API 客户端
 *   （Apifox 调试、后续前端 typed client）换取 access token。
 * @ApiBearerAuth 挂在 me 方法级而非类级：login 是公开端点，文档不应出现 Bearer 参数。
 */
@ApiTags('auth')
@ApiErrorResponses('401', '500')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiBearerAuth()
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

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '邮箱密码登录，返回访问令牌（公开端点）' })
  // 请求体 schema 来自 zod 契约（TS 类型运行时擦除，swagger 反射不出，同 ApiDataOk 的背景）
  @ApiBody({ schema: toOpenApiSchema(loginSchema, 'input') })
  @ApiDataOk(
    {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'Supabase access token，放 Authorization: Bearer 头',
        },
        tokenType: { type: 'string', description: '令牌类型，恒为 bearer' },
        expiresIn: { type: 'number', description: '有效期（秒）' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '用户 UUID' },
            email: { type: 'string', description: '邮箱' },
          },
          required: ['id'],
        },
      },
      required: ['accessToken', 'tokenType', 'expiresIn', 'user'],
    },
    '登录结果',
  )
  @ApiErrorResponses('400', '401', '500')
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput): Promise<LoginResult> {
    return this.authService.signInWithPassword(dto)
  }
}
