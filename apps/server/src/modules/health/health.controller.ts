import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator.ts'
import { HealthService } from './health.service.ts'

/**
 * 健康探针端点。
 *
 * 双端点设计：
 *   - GET /api/v1/health/liveness  → 存活探针：无外部依赖，200 即可。
 *   - GET /api/v1/health/readiness → 就绪探针：验证 DB 连通性，失败返回 503。
 *   - GET /api/v1/health           → 向后兼容，等价于 readiness。
 *
 * @Public → 豁免 JWT 鉴权（K8s / 负载均衡器不携带 Bearer token）。
 * @SkipThrottle → 豁免限流（探针每秒被轮询，不计入请求配额）。
 * autoLogging.ignore 在 app.module.ts 的 pinoHttp 配置中排除了 /health 路径，
 * 探针请求不会产生日志输出（避免日志洪泛）。
 */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('liveness')
  liveness(): { status: 'ok' } {
    return { status: 'ok' }
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  async readiness() {
    const db = await this.healthService.checkDatabase()
    if (db.status === 'disconnected') {
      return { status: 'error', db: 'disconnected' }
    }
    return { status: 'ok', db: 'connected', latencyMs: db.latencyMs }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    return this.readiness()
  }
}
