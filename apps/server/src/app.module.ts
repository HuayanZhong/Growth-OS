import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { APP_FILTER } from '@nestjs/core'
import dbConfig from '../mikro-orm.config.ts'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.ts'
import { validate } from './config/env.validation.ts'
import { AuthModule } from './modules/auth/auth.module.ts'
import { HealthModule } from './modules/health/health.module.ts'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // env 由根目录 dotenv-cli 注入到 process.env，ConfigModule 不再读 .env 文件
      // 这样保持单一真相源，避免子包 cwd 与根目录 .env 路径歧义
      envFilePath: [],
      validate,
    }),
    // MikroORM v7 起 forRoot 必须显式传配置；直接复用 CLI 配置文件，单一真相源防漂移
    MikroOrmModule.forRoot(dbConfig),
    AuthModule,
    HealthModule,
  ],
  providers: [
    // 全局异常过滤器：统一错误响应为 ApiErrorEnvelope（契约在 @growth-os/types）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
