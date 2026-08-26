import { Controller, Get } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator.ts'

/**
 * 存活探针：GET /api/v1/health —— 公开端点（@Public 豁免鉴权）。
 * 保持最小实现；DB 连通性检查留到需要时再加。
 */
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' }
  }
}
