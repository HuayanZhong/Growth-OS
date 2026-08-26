import { NestFactory } from '@nestjs/core'
import { VersioningType } from '@nestjs/common'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module.ts'

async function bootstrap() {
  // bufferLogs: true → NestJS 启动阶段的日志暂存内存，等自定义 Logger 就绪后再统一刷出。
  // 不加 bufferLogs 的话，启动早期的日志会用 NestJS 内置 ConsoleLogger 输出，
  // 之后才切换到 pino，导致前几行日志格式不一致（JSON vs 彩色文本混杂）。
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  // 用 nestjs-pino 的 Logger 替换 NestJS 内置 Logger。
  // 替换后，所有 controller / service 中通过 DI 注入的 Logger（或 this.logger）都会走 pino，
  // 自动携带当前请求的 req.id / method / url（通过 AsyncLocalStorage 传播，无需手动传参）。
  app.useLogger(app.get(Logger))

  // 全局路由前缀 + URI 版本控制：所有端点统一 /api/v1/... 前缀。
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  // CORS 白名单：
  //   - 配置了 CORS_ORIGINS → 仅允许列表中的 origin（生产环境安全策略）。
  //   - 未配置 → 允许所有 origin（桌面端开发阶段 file:// 协议无 Origin 头，白名单会误杀）。
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors(corsOrigins?.length ? { origin: corsOrigins } : {})

  // enableShutdownHooks：监听 SIGTERM / SIGINT，触发 MikroORM 连接池优雅关闭。
  // 不调用的话，进程被 kill 时数据库连接不会释放，Supabase 连接数会慢慢耗尽。
  app.enableShutdownHooks()

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  app.get(Logger).log(`Server running on http://localhost:${port}`)
}

// 启动失败（端口占用、env 缺失等）必须以非零码退出。
// 不 exit 的话，进程会静默假死（监听不到端口但不报错），Docker / PM2 以为进程正常，不会重启。
// 此处用 process.stderr.write 而非 console.error，因为此时 NestJS Logger 尚未就绪。
bootstrap().catch((err) => {
  process.stderr.write(`启动失败: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
