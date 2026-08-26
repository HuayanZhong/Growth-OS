import { Injectable } from '@nestjs/common'
import { InjectMikroORM } from '@mikro-orm/nestjs'
import type { MikroORM } from '@mikro-orm/core'

/**
 * 健康检查服务：封装 DB 连通性验证。
 *
 * readiness 探针通过此服务执行 SELECT 1 验证数据库连接池是否可用。
 * 超时 5s：DB 挂死时（TCP 半开、连接池耗尽）探针不会无限挂起，
 * K8s 能及时将 Pod 标记为 Not Ready，停止转发流量。
 *
 * 超时实现：Promise.race 包装 DB 查询，不依赖 statement_timeout（后者需连接级设置，
 * 且某些驱动/连接池模式下不生效）。Promise.race 是应用层最可靠的超时保障。
 * finally 块确保无论成功/失败都 clearTimeout，防止 timer 泄漏。
 */
@Injectable()
export class HealthService {
  /** DB 探针超时（毫秒）：超过此时间视为连接异常 */
  private static readonly DB_PING_TIMEOUT_MS = 5_000

  constructor(@InjectMikroORM('default') private readonly orm: MikroORM) {}

  async checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; latencyMs?: number }> {
    const start = Date.now()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const query = this.orm.em.getConnection().execute('SELECT 1')
      const timeout = new Promise<never>(
        (_, reject) =>
          (timer = setTimeout(
            () => reject(new Error('DB ping timeout')),
            HealthService.DB_PING_TIMEOUT_MS,
          )),
      )
      await Promise.race([query, timeout])
      return { status: 'connected', latencyMs: Date.now() - start }
    } catch {
      return { status: 'disconnected' }
    } finally {
      // 成功路径：timer 已被 clearTimeout 清理；失败路径：timer 可能未触发，同样清理
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}
