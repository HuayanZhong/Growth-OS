import { Injectable } from '@nestjs/common'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import type { MikroORM } from '@mikro-orm/core'

/**
 * 健康检查服务：封装 DB 连通性验证。
 *
 * readiness 探针通过此服务执行 SELECT 1 验证数据库连接池是否可用。
 * 超时 5s：DB 挂死时探针不会无限挂起，K8s 能及时将 Pod 标记为 Not Ready。
 */
@Injectable()
export class HealthService {
  constructor(@InjectMikroORM('default') private readonly orm: MikroORM) {}

  async checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; latencyMs?: number }> {
    const start = Date.now()
    try {
      await this.orm.em.getConnection().execute('SELECT 1')
      return { status: 'connected', latencyMs: Date.now() - start }
    } catch {
      return { status: 'disconnected' }
    }
  }
}
