import { All, Controller, Module, NotFoundException } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

/**
 * 兜底路由（platform-surface 契约）：未匹配任何业务/平台路由的请求统一返回
 * ApiErrorEnvelope 404。URI versioning + global prefix 下，未匹配请求会落到
 * Express 默认 404（HTML），绕过 AllExceptionsFilter——由本 controller 收口。
 * 本模块必须排在 AppModule imports 的最后，避免遮蔽先注册的具体路由。
 */
@Controller('{*path}')
class NotFoundController {
  @All()
  @ApiExcludeEndpoint()
  notFound(): never {
    throw new NotFoundException({ code: 'NOT_FOUND', message: '接口不存在' })
  }
}

@Module({
  controllers: [NotFoundController],
})
export class NotFoundModule {}
