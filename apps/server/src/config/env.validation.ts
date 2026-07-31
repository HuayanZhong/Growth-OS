import { z, parseEnv, envIntString } from '@growth-os/shared';

/**
 * 服务端环境变量 schema。
 * 每个字段对应 .env.example 中"后端服务配置"区的变量。
 * 客户端可访问的 NUXT_PUBLIC_* 不在此校验，由 Nuxt 侧负责。
 */
const envSchema = z.object({
  PORT: envIntString(),
});

/**
 * ConfigModule 的 validate 函数。
 * 缺失或类型错误时立即抛 EnvError，NestJS 启动失败，对应 P1 #7。
 *
 * CI 环境跳过校验，避免阻塞构建/测试流水线（CI 不依赖真实外部服务）。
 * env 文件由根目录 dotenv-cli 注入到 process.env，ConfigModule 不再读 .env 文件。
 */
export function validate(config: Record<string, unknown>) {
  if (process.env.CI === 'true') return config;
  return parseEnv(envSchema, config, { label: 'server' });
}
