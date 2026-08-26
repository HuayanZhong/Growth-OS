import { ConfigService } from '@nestjs/config'
import type { ThrottlerOptions } from '@nestjs/throttler'

/**
 * 限流配置工厂：从环境变量读取 TTL 和限额，缺省 60s / 100 次。
 *
 * 为什么缺省 100 次？
 *   桌面应用正常打开一个页面会并发 5-10 个请求（auth/me + health + 页面数据），
 *   100 次/分钟足够正常使用，同时能有效阻断扫描器的批量探测（通常 >1000 次/分钟）。
 *
 * 为什么用 ConfigService 而非直接 process.env？
 *   ConfigService 统一管理 env 访问，方便单元测试时 mock；
 *   同时与 ConfigModule 的 validate 流程对齐，确保 env 变量在到达业务代码前已经过 zod 校验。
 */
export function createThrottlerOptions(config: ConfigService): ThrottlerOptions[] {
  const ttl = config.get<number>('THROTTLE_TTL_MS') ?? 60_000
  const limit = config.get<number>('THROTTLE_LIMIT') ?? 100

  return [{ ttl, limit }]
}
