import { z } from 'zod'

/**
 * 环境变量错误类，承载 schema 校验失败的具体 issue 列表。
 * 调用方可通过 `error.issues` 拿到每个字段的失败原因，用于日志或用户提示。
 */
export class EnvError extends Error {
  readonly issues: Array<{ path: string; message: string }>

  constructor(message: string, issues: Array<{ path: string; message: string }>) {
    super(message)
    this.name = 'EnvError'
    this.issues = issues
  }
}

/**
 * 从环境变量中解析配置。
 *
 * 设计要点：
 * - 只负责"解析 + 校验"，不负责"加载"（加载由 dotenv-cli / ConfigModule 做）
 * - 调用方传入 `process.env`，函数返回类型安全的 config 对象
 * - 校验失败抛 EnvError，NestJS / Nuxt 启动失败，对应 P1 #7
 *
 * @example
 * const schema = z.object({
 *   OPENAI_API_KEY: envString(),
 *   PORT: envIntString(),
 * });
 * const config = parseEnv(schema, process.env, { label: 'server' });
 * // config.PORT 已是 number 类型
 */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  env: Record<string, unknown>,
  opts?: { label?: string },
): z.infer<TSchema> {
  const parsed = schema.safeParse(env)
  if (parsed.success) return parsed.data
  const issues = parsed.error.issues.map((i: { path: PropertyKey[]; message: string }) => ({
    path: i.path.join('.'),
    message: i.message,
  }))
  const label = opts?.label ? ` (${opts.label})` : ''
  throw new EnvError(`Invalid environment${label}`, issues)
}

// ============================================================
// Schema 工厂函数 —— 组合使用，定义各 app 的 env schema
// ============================================================

/** 必填非空字符串 */
export function envString() {
  return z.string().min(1)
}

/** 可选字符串（缺失时为 undefined） */
export function envOptionalString() {
  return z.string().optional()
}

/** URL 字符串（校验格式，zod v4 顶级函数） */
export function envUrlString() {
  return z.url()
}

/** 正整数（自动从字符串 coercion 为 number） */
export function envIntString() {
  return z.coerce.number().int().positive()
}

/** 非负整数（用于端口 0 等边界情况） */
export function envNonNegativeIntString() {
  return z.coerce.number().int().nonnegative()
}

/** 布尔值（"true"/"false"/"1"/"0" 自动 coercion） */
export function envBoolString() {
  return z.coerce.boolean()
}
