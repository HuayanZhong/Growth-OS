import { INestApplication, Module, VersioningType } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validate } from '../src/config/env.validation.ts'
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.ts'
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor.ts'
import { AuthModule } from '../src/modules/auth/auth.module.ts'
import { HealthModule } from '../src/modules/health/health.module.ts'
import { ThrottleModule } from '../src/modules/throttle/throttle.module.ts'

/**
 * e2e 专用装配：不引 AppModule（其 MikroORM 为 v7 ESM-only 包，Jest CJS 运行时
 * 无法 require——生产走 Node 24 require(ESM) 不受影响）。当前被测端点
 * （health/auth）不触达数据库，故只装配鉴权链路并镜像 AppModule 的全局设施
 * （env 校验、异常过滤器、响应信封、限流、前缀/版本）；M2 出现 DB 端点后需重估方案。
 * 与 main.ts 保持同步——新增全局设置时两处都要改（见 Agent Note）。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [], validate }),
    ThrottleModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
class E2EAppModule {}

export async function createE2EApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [E2EAppModule] }).compile()
  const app = moduleRef.createNestApplication()
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
  await app.init()
  return app
}
