import { Module, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { IncomingMessage } from 'http'
import { LoggerModule } from 'nestjs-pino'
import dbConfig from '../mikro-orm.config.ts'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.ts'
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor.ts'
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.ts'
import { validate } from './config/env.validation.ts'
import { AuthModule } from './modules/auth/auth.module.ts'
import { HealthModule } from './modules/health/health.module.ts'
import { ThrottleModule } from './modules/throttle/throttle.module.ts'

const isProd = process.env.NODE_ENV === 'production'

/**
 * pinoHttp 共享配置：genReqId 和 autoLogging.ignore 在 dev/prod 两个分支完全相同，
 * 提取为常量消除重复。autoLogging.ignore 精确匹配 /api/v1/health 前缀，
 * 避免 '/health' 字符串包含匹配误伤 /heartbeat 等路径。
 */
const PINO_GEN_REQ_ID: (req: IncomingMessage) => string = (req) =>
  (req.headers['x-request-id'] as string) ?? crypto.randomUUID()
const PINO_AUTO_LOGGING_IGNORE: (req: IncomingMessage) => boolean = (req) =>
  req.url?.startsWith('/api/v1/health') ?? false

@Module({
  imports: [
    // ---- 请求日志 + 请求 ID ----
    // nestjs-pino 基于 pino-http，自动为每个请求生成 child logger，
    // 所有后续日志（包括 controller/service 内的 this.logger.log）都会携带 req.id / method / url / statusCode / responseTime。
    // genReqId：优先取客户端传入的 X-Request-Id（前端链路追踪），没有则随机生成 UUID。
    // autoLogging.ignore：健康探针每秒被 K8s 轮询，刷日志会淹没业务日志，直接跳过。
    // 生产用纯 pino JSON（方便 ELK/Loki 采集），开发用 pino-pretty 彩色单行（人眼友好）。
    // ⚠️ LoggerModule.forRoot 只能在根模块调一次，且必须是顶层 import；
    //    如果在子模块再 import 裸 LoggerModule 类会导致 pino-http 中间件重复注册，请求日志翻倍（静默失败，无报错）。
    LoggerModule.forRoot({
      // nestjs-pino 默认 forRoutes('*') 在 Nest 12 触发 LegacyRouteConverter 警告，
      // 显式传 v12 具名通配语法消除（上游 v12 兼容版发布后可移除）
      forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
      pinoHttp: isProd
        ? {
            level: process.env.LOG_LEVEL ?? 'info',
            genReqId: PINO_GEN_REQ_ID,
            autoLogging: { ignore: PINO_AUTO_LOGGING_IGNORE },
          }
        : {
            level: process.env.LOG_LEVEL ?? 'debug',
            transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
            genReqId: PINO_GEN_REQ_ID,
            autoLogging: { ignore: PINO_AUTO_LOGGING_IGNORE },
          },
    }),

    // ConfigModule.forRoot：加载 env 校验（validate 函数）。
    // env 由根目录 dotenv-cli 级联注入到 process.env，ConfigModule 自身不读 .env 文件（单一真相源）。
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [],
      validate,
    }),

    // MikroORM：直接复用 mikro-orm.config.ts CLI 配置文件，避免 ORM 配置在两处维护导致漂移。
    // registerRequestContext: false——mikro-orm/nestjs@7.0.3-dev 在 contextName 模式下
    // MikroOrmMiddleware 仍注入未注册的 MikroORM class token（上游不完整），显式关闭
    // per-request EM 中间件；M2 出现需要 per-request EntityManager 的端点时重开并复评。
    MikroOrmModule.forRoot({ ...dbConfig, registerRequestContext: false }),

    // ---- 限流 ----
    // ThrottleModule 通过 forRootAsync 读取 ConfigService 注入的 THROTTLE_TTL_MS / THROTTLE_LIMIT，
    // 缺省值 60s / 100 次（桌面应用正常用量）。
    // ThrottlerGuard 注册在下方 providers 的 APP_GUARD，对所有路由生效；
    // 健康探针等端点通过 @SkipThrottle() 豁免。
    ThrottleModule,

    AuthModule,
    HealthModule,
  ],
  providers: [
    // 全局异常过滤器：所有未捕获异常统一归一化为 ApiErrorEnvelope { code, message, details? }。
    // Logger 由 nestjs-pino 注入，5xx 错误自动携带 req 上下文（req.id / method / url）。
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // 全局限流守卫：ThrottlerGuard 在 JwtGuard 之前执行（限流先于鉴权，避免无效请求消耗 JWT 验证开销）。
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // 请求超时拦截器：普通 REST 端点 30s 超时，SSE 流式端点通过 @SkipTimeout() 豁免。
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },

    // 成功响应信封：controller 返回值自动包装为 { data: T }，与错误路径 ApiErrorEnvelope 对称。
    // SSE / 204 端点天然不受影响（SSE 走 res.write 直接输出，204 在拦截器内短路）。
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
