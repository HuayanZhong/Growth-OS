import { z, parseEnv, envString, envIntString, envBoolString } from '@growth-os/shared'

/**
 * 服务端环境变量 schema。
 * 每个字段对应 .env.example 中"后端服务配置"区的变量。
 * 客户端可访问的 NUXT_PUBLIC_* 不在此校验，由 Nuxt 侧负责。
 */
const envSchema = z.object({
  PORT: envIntString(),
  // MikroORM 数据库连接串（Supabase Postgres direct connection，见 .env.example）
  DATABASE_URL: envString(),
  // MikroORM 调试日志开关：true 时打印 SQL 查询与参数（缺失视为 false）
  DB_DEBUG: envBoolString().optional(),
  // Supabase 项目 URL（JWT 验证用）：可选，缺省回退 NUXT_PUBLIC_SUPABASE_URL
  SUPABASE_URL: envString().optional(),
  // Supabase anon key（HS256 legacy 项目验签用）：HS256 回退路径需要此值调 Auth 服务器探针。
  // 非 HS256 项目可不设；缺失时 HS256 token 会静默拒绝（UNAUTHORIZED），但不阻塞 JWKS 项目。
  NUXT_PUBLIC_SUPABASE_ANON_KEY: envString().optional(),
  // 生产 CORS 白名单：逗号分隔 origin；缺省保持全开（桌面端 file:// 无 Origin 头）
  CORS_ORIGINS: envString().optional(),
  // 限流配置（@nestjs/throttler）：TTL = 窗口时长（毫秒），limit = 窗口内最大请求数。
  // 缺省 60s / 100 次，覆盖桌面应用正常用量；扫描器/DDoS 通常 >1000 次/分钟会被拦截。
  THROTTLE_TTL_MS: envIntString().optional(),
  THROTTLE_LIMIT: envIntString().optional(),
  // PostgreSQL statement_timeout（毫秒）：防止单条慢查询无限执行耗尽连接池。
  // 缺省 10s；开发环境设 0 可禁用（允许慢查询调试）。
  DB_STATEMENT_TIMEOUT_MS: envIntString().optional(),
})

/**
 * ConfigModule 的 validate 函数。
 * 缺失或类型错误时立即抛 EnvError，NestJS 启动失败，对应 P1 #7。
 *
 * CI 环境跳过校验，避免阻塞构建/测试流水线（CI 不依赖真实外部服务）。
 * env 文件由根目录 dotenv-cli 注入到 process.env，ConfigModule 不再读 .env 文件。
 */
export function validate(config: Record<string, unknown>) {
  if (process.env.CI === 'true') return config
  return parseEnv(envSchema, config, { label: 'server' })
}
