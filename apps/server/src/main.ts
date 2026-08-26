import { NestFactory } from '@nestjs/core'
import { VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module.ts'
import { compressionMiddleware } from './main/compression.middleware.ts'
import { helmetMiddleware } from './main/helmet.middleware.ts'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  app.useLogger(app.get(Logger))

  // ---- 响应压缩 ----
  // 必须在路由注册之前注册，否则中间件不会拦截到请求。
  // 排除 SSE（text/event-stream）：流式响应逐块发送，压缩会缓冲输出导致浏览器 SSE parser 卡死。
  // 阈值 1024 字节：小于 1KB 的响应压缩后反而更大（gzip 头部开销约 200 字节）。
  app.use(compressionMiddleware())

  // ---- 安全头（Helmet）----
  // 必须在路由注册之前注册。
  // CSP / COEP 在 Electron 环境下禁用（file:// 协议 + preload 脚本需要跨域加载），
  // 其余安全头（X-Content-Type-Options、X-Frame-Options 等）保持开启。
  app.use(helmetMiddleware())

  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  app.enableCors(corsOrigins?.length ? { origin: corsOrigins } : {})

  app.enableShutdownHooks()

  const port = process.env.PORT ?? 4000

  // ---- Swagger / OpenAPI ----
  // 非生产环境自动生成 API 文档，生产环境不暴露（避免信息泄露）。
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Growth OS API')
      .setDescription('Growth OS 后端服务 API 文档（自动生成）')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('docs', app, document)
    app.get(Logger).log(`Swagger docs: http://localhost:${port}/docs`)
  }

  await app.listen(port)
  app.get(Logger).log(`Server running on http://localhost:${port}`)
}

bootstrap().catch((err) => {
  process.stderr.write(`启动失败: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
