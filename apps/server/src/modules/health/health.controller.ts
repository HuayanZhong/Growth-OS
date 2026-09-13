import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { SchemaObject } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { ApiDataOk, ApiErrorResponses } from '../../common/openapi/schema.ts'
import { Public } from '../../common/decorators/public.decorator.ts'
import { HealthService } from './health.service.ts'

/** readiness 的 200 响应 schema（readiness 与向后兼容的 check 共用） */
const READINESS_OK_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok'] },
    db: { type: 'string', enum: ['connected'] },
    latencyMs: { type: 'number', description: 'DB ping 往返耗时（ms）' },
  },
}

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
@ApiTags('health')
@Public()
@SkipThrottle()
@ApiErrorResponses('500')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('liveness')
  @ApiOperation({ summary: '存活探针：无外部依赖，200 即存活' })
  @ApiDataOk({ type: 'object', properties: { status: { type: 'string', enum: ['ok'] } } }, '存活')
  liveness(): { status: 'ok' } {
    return { status: 'ok' }
  }

  @Get('readiness')
  @ApiOperation({ summary: '就绪探针：校验 DB 连通性，失败返回 503' })
  @ApiErrorResponses('503')
  @ApiDataOk(READINESS_OK_SCHEMA, '就绪（DB 连通）')
  async readiness() {
    const db = await this.healthService.checkDatabase()
    if (db.status === 'disconnected') {
      // K8s readiness probe 仅看 HTTP 状态码：2xx = ready，5xx = not ready。
      // 返回 503 让 K8s 停止向此 Pod 转发流量，而非返回 200 让死 Pod 继续接请求。
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: '数据库连接异常',
      })
    }
    return { status: 'ok', db: 'connected', latencyMs: db.latencyMs }
  }

  @Get()
  @ApiOperation({ summary: '健康检查（等价 readiness，向后兼容）' })
  @ApiErrorResponses('503')
  @ApiDataOk(READINESS_OK_SCHEMA, '就绪（DB 连通）')
  async check() {
    return this.readiness()
  }
}
