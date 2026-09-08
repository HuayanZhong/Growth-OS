# Configuration catalog

> **Generated** by [generate-config-catalog.cjs](../scripts/generate-config-catalog.cjs) — do not edit by hand.
> `pnpm verify:docs` fails when this file is stale; regenerate with `pnpm generate:config` and commit.
> [.env.example](../.env.example) holds template values; the dotenv chain order lives in the root [package.json](../package.json) scripts.

## Public runtime schema — `publicEnvSchema`

Source: [packages/shared/src/env.ts](../packages/shared/src/env.ts). Consumed by the Nuxt `runtimeConfig.public` mapping and by the server through `publicEnvSchema.partial()` (all three optional server-side; the extend block below carries no `NUXT_PUBLIC_*` keys).

| Variable | Validation |
| --- | --- |
| `NUXT_PUBLIC_SUPABASE_URL` | `envUrlString()` |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | `envString()` |
| `NUXT_PUBLIC_API_BASE_URL` | `envUrlString()` |

## Server env schema — `envSchema`

Source: [apps/server/src/config/env.validation.ts](../apps/server/src/config/env.validation.ts). Validated by `ConfigModule` at boot (skipped when `CI=true`); missing or invalid values abort startup. Validation helpers live in `packages/shared/src/env.ts`.

| Variable | Validation | Description |
| --- | --- | --- |
| `PORT` | `envIntString()` | — |
| `DATABASE_URL` | `envString()` | MikroORM 数据库连接串（Supabase Postgres direct connection，见 .env.example） |
| `DB_DEBUG` | `envBoolString().optional()` | MikroORM 调试日志开关：true 时打印 SQL 查询与参数（缺失视为 false） |
| `SUPABASE_URL` | `envString().optional()` | Supabase 项目 URL（JWT 验证用）：可选，缺省回退 NUXT_PUBLIC_SUPABASE_URL |
| `CORS_ORIGINS` | `envString().optional()` | 生产 CORS 白名单：逗号分隔 origin；缺省保持全开（桌面端 file:// 无 Origin 头） |
| `THROTTLE_TTL_MS` | `envIntString().optional()` | 限流配置（@nestjs/throttler）：TTL = 窗口时长（毫秒），limit = 窗口内最大请求数。 缺省 60s / 100 次，覆盖桌面应用正常用量；扫描器/DDoS 通常 >1000 次/分钟会被拦截。 |
| `THROTTLE_LIMIT` | `envIntString().optional()` | — |
| `DB_STATEMENT_TIMEOUT_MS` | `envIntString().optional()` | PostgreSQL statement_timeout（毫秒）：防止单条慢查询无限执行耗尽连接池。 缺省 10s；开发环境设 0 可禁用（允许慢查询调试）。 |
| `LLM_API_KEY` | `envString().optional()` | LLM 供应商凭证（DeepSeek/OpenAI 兼容网关）：可选，缺 key 时适配器调用即抛错 |
| `LLM_BASE_URL` | `envUrlString().optional()` | LLM API 基址（OpenAI 兼容）：缺省 https://api.deepseek.com |

## Desktop launch allowlist

Source: [packages/desktop-core/ipc/launch-env.ts](../packages/desktop-core/ipc/launch-env.ts). The main process hands only these variables to the renderer, which merges them into `runtimeConfig` before app assembly (launch-time override; secrets never pass through).

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `NUXT_PUBLIC_API_BASE_URL`
- `NUXT_PUBLIC_APP_NAME`
- `NUXT_PUBLIC_SITE_URL`
