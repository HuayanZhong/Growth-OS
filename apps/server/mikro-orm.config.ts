import { defineConfig } from '@mikro-orm/postgresql'
import { Migrator } from '@mikro-orm/migrations'
import { SeedManager } from '@mikro-orm/seeder'
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

  // PostgreSQL statement_timeout：防止单条慢查询无限执行耗尽连接池。
  // 缺省 10s；DB_STATEMENT_TIMEOUT_MS=0 可禁用（开发环境允许慢查询调试）。
  driverOptions: {
    connection: {
      options: {
        statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 10_000),
      },
    },
  },

  // 开启迁移与种子功能
  extensions: [Migrator, SeedManager],

  // SchemaGenerator 只管理 public schema，忽略 Supabase 系统 schema
  schemaGenerator: {
    ignoreSchema: [
      'auth',
      'storage',
      'realtime',
      'vault',
      'extensions',
      'graphql',
      'graphql_public',
      'pgsodium',
      'pgsodium_masks',
      'supabase_functions',
      'supabase_migrations',
      'pgbouncer',
    ],
  },

  // 迁移文件：src 下 .ts 源（CLI/tsx 用），dist 下编译后的 .js（生产 node 用）
  migrations: {
    path: 'dist/infra/database/migrations',
    pathTs: 'src/infra/database/migrations',
  },

  // 种子数据：基础设施层 src/infra/database/seeders
  seeder: {
    path: 'dist/infra/database/seeders',
    pathTs: 'src/infra/database/seeders',
    defaultSeeder: 'DatabaseSeeder',
  },

  // 元数据提供器：TsMorph 解析实体类型，生产同样可用
  // node 运行时靠 dist 同目录的 .d.ts 推断类型（tsconfig 需开 declaration: true），
  // 或先跑 mikro-orm cache:generate 生成元数据缓存
  metadataProvider: TsMorphMetadataProvider,

  // 慢 SQL 查询日志（超过 200ms 自动记录，不受 debug 开关影响）
  slowQueryThreshold: 200,

  // 调试模式：DB_DEBUG=true 时打印 SQL 查询与参数（生产环境应保持 false）
  debug: process.env.DB_DEBUG === 'true',
})
