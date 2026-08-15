import { defineConfig } from '@mikro-orm/postgresql'
import { Migrator } from '@mikro-orm/migrations'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'

// CLI 直接运行时不经 NestJS ConfigModule 校验，这里兜底
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('缺少 DATABASE_URL：请在根目录 .env 中配置 Supabase 数据库连接串')

export default defineConfig({
  // 实体类路径
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],

  // Supabase Postgres direct connection（长期运行的后端进程用 direct，不用 transaction pooler）
  clientUrl: databaseUrl,

  // 开启迁移功能
  extensions: [Migrator],

  // 元数据提供器：TsMorph 解析实体类型，生产同样可用
  // node 运行时靠 dist 同目录的 .d.ts 推断类型（tsconfig 需开 declaration: true），
  // 或先跑 mikro-orm cache:generate 生成元数据缓存
  metadataProvider: TsMorphMetadataProvider,

  // 调试模式：DB_DEBUG=true 时打印 SQL 查询与参数（生产环境应保持 false）
  debug: process.env.DB_DEBUG === 'true',
})
