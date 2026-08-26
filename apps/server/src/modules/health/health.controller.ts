import { Controller, Get } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator.ts'

/**
 * 健康探针：GET /api/v1/health
 *
 * @Public → 豁免 JWT 鉴权（K8s / 负载均衡器不会携带 Bearer token）。
 * @SkipThrottle → 豁免限流（探针每秒被轮询，不计入请求配额）。
 * autoLogging.ignore 在 app.module.ts 的 pinoHttp 配置中排除了 /health 路径，
 * 所以探针请求不会产生日志输出（避免日志洪泛）。
 *
 * 当前为最小实现（仅存活探针）；就绪探针（含 DB 连通性检查）在第二批基建中加入。
 */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
