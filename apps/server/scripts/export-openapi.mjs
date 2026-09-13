/**
 * 导出 OpenAPI spec 到 openapi.json（迭代计划 1.5 P2）。
 *
 * 前置：先 pnpm --filter server build。AppModule 从 dist（SWC 编译产物）加载——
 * 不要经 tsx/esbuild 加载 src：esbuild 的 emitDecoratorMetadata 不完整，
 * Nest 12 DI 会把 TurnService 的构造参数解析为 undefined（启动即崩）。
 * 纯 JS + dist 与生产启动路径（node dist/src/main.js）完全同构。
 *
 * 文档元信息与 main.ts 共用 buildOpenApiConfig()（同一份 DocumentBuilder 参数），
 * 路由前缀/版本（api + URI v1）在下方保持一致。
 * 产物提交入库，供 review diff 与后续 CI 校验（drift 即 fail）。
 *
 * 需要 DATABASE_URL（AppModule 初始化会连接 DB）——用 package.json 的
 * openapi:export 脚本经 dotenv 级联注入，CI 无 DB 环境下不运行。
 */
import { writeFileSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { VersioningType } from '@nestjs/common'
import { SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '../dist/src/app.module.js'
import { buildOpenApiConfig } from '../dist/src/common/openapi/document.js'

async function main() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, logger: false })

  // 与 main.ts 一致：前缀/版本影响 createDocument 生成的路径（/api/v1/...）
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig())

  // 包脚本运行时 cwd = apps/server，产物随仓库提交
  writeFileSync('openapi.json', `${JSON.stringify(document, null, 2)}\n`)

  await app.close()
  process.stdout.write('OpenAPI spec 已导出: apps/server/openapi.json\n')
}

main().catch((err) => {
  process.stderr.write(`导出失败: ${err instanceof Error ? err.stack : String(err)}\n`)
  process.exit(1)
})
