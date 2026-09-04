/**
 * 导出 OpenAPI spec 到 openapi.json（迭代计划 1.5 P2）。
 *
 * 与 main.ts 的 Swagger 配置保持同一份 DocumentBuilder 参数与路由前缀，
 * 产物提交入库，供 review diff 与后续 CI 校验（drift 即 fail）。
 *
 * 需要 DATABASE_URL（AppModule 初始化会连接 DB）——用 package.json 的
 * openapi:export 脚本经 dotenv 级联注入，CI 无 DB 环境下不运行。
 * server 包为 CJS（无 type: module），不能用顶层 await，走 main() 入口。
 */
import { writeFileSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '../src/app.module.ts'

async function main() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, logger: false })

  // 与 main.ts 一致：前缀/版本影响 createDocument 生成的路径（/api/v1/...）
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  const config = new DocumentBuilder()
    .setTitle('Growth OS API')
    .setDescription('Growth OS 后端服务 API 文档（自动生成）')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)

  // 包脚本运行时 cwd = apps/server，产物随仓库提交
  writeFileSync('openapi.json', `${JSON.stringify(document, null, 2)}\n`)

  await app.close()
  process.stdout.write('OpenAPI spec 已导出: apps/server/openapi.json\n')
}

main().catch((err: unknown) => {
  process.stderr.write(`导出失败: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
