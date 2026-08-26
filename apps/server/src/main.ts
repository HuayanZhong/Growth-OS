import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.ts'
import { Logger, VersioningType } from '@nestjs/common'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  // 全局前缀 + URI 版本控制 → /api/v1/...
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  // CORS：配置 CORS_ORIGINS（逗号分隔）时收敛为白名单；缺省全开——
  // 桌面端生产经 file:// 加载无 Origin 头，白名单会误杀本地窗口请求
  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors(corsOrigins?.length ? { origin: corsOrigins } : {})

  // 进程终止信号监听：SIGTERM 时 MikroORM 连接才会随应用关闭（官方要求）
  app.enableShutdownHooks()

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  logger.log(`Server running on http://localhost:${port}`)
}

// 启动失败必须以非零码退出：端口占用等场景下静默假死会骗过子进程监督
bootstrap().catch((err) => {
  new Logger('Bootstrap').error(`启动失败: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
