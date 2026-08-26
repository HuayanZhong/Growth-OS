import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { createThrottlerOptions } from './throttle.config.ts'

/**
 * 限流模块。
 *
 * 使用 forRootAsync + ConfigService 注入环境变量，避免硬编码 TTL/限额。
 * ThrottlerGuard 通过 AppModule 的 APP_GUARD 全局注册，
 * 本模块只负责配置 ThrottlerModule 的内部存储和默认策略。
 *
 * 特定端点豁免方式：
 *   - @SkipThrottle() → 完全跳过限流（健康探针用）。
 *   - @Throttle({ default: { limit: 5, ttl: 60_000 } }) → 覆盖全局策略（登录端点收紧用）。
 *
 * 当前存储：内存（单实例足够）。多实例部署时切换 @nest-lab/throttler-storage-redis。
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createThrottlerOptions,
    }),
  ],
})
export class ThrottleModule {}
