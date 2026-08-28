import { DynamicModule, INestApplication, Module, VersioningType } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'
import { getMikroORMToken } from '@mikro-orm/nestjs'
import type { MikroORM } from '@mikro-orm/core'
import { Test } from '@nestjs/testing'
import { validate } from '../src/config/env.validation.ts'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.ts'
import { TimeoutInterceptor } from '../src/common/interceptors/timeout.interceptor.ts'
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor.ts'
import { AuthModule } from '../src/modules/auth/auth.module.ts'
import { HealthModule } from '../src/modules/health/health.module.ts'
import { ThrottleModule } from '../src/modules/throttle/throttle.module.ts'

/**
 * e2e 专用装配：不引 AppModule（其 MikroORM 为 v7 ESM-only 包，Jest CJS 运行时
 * 无法 require——生产走 Node 24 require(ESM) 不受影响；Vitest 原生 ESM 无此限制）。
 * 当前被测端点（health/auth）不触达数据库，故只装配鉴权链路并镜像 AppModule 的
 * 全局设施（env 校验、请求日志、异常过滤器、超时、响应信封、限流、前缀/版本）。
 * 与 main.ts 保持同步——新增全局设置时两处都要改（见 Agent Note）。
 */

// e2e 无真实 DB：为 ORM 实例 token（生产由 @Global 的 MikroOrmModule.forRoot 注册）
// 提供全局桩实现。getConnection 直接抛错 → HealthService 走 disconnected 路径
// → readiness 503（与用例预期一致）。
const ORM_STUB = {
  em: {
    getConnection: () => {
      throw new Error('e2e 环境无 DB 连接')
    },
  },
} as unknown as MikroORM

// module 字段的类仅作 DI 模块标识；空 @Module 让 no-extraneous-class 规则放行
@Module({})
class StubMikroOrmModule {}

const StubMikroOrmDynamicModule: DynamicModule = {
  global: true,
  module: StubMikroOrmModule,
  providers: [{ provide: getMikroORMToken('default'), useValue: ORM_STUB }],
  exports: [{ provide: getMikroORMToken('default'), useValue: ORM_STUB }],
}

@Module({
  imports: [
    StubMikroOrmDynamicModule,
    // 镜像 AppModule 的请求日志设施；level: silent 避免测试输出被 pino 日志淹没
    LoggerModule.forRoot({ pinoHttp: { level: 'silent', genReqId: () => 'e2e' } }),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [], validate }),
    ThrottleModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class E2EAppModule {}

export async function createE2EApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [E2EAppModule] }).compile()
  const app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
  await app.init()
  return app
}
