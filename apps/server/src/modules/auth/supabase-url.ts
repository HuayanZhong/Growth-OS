import { UnauthorizedException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'

/**
 * 解析 Supabase 项目 URL（auth 模块共用）：
 * SUPABASE_URL → NUXT_PUBLIC_SUPABASE_URL → 拒绝。
 * 未配置属服务端配置缺失，统一以 401 信封表达（不向客户端泄露配置细节）。
 */
export function resolveSupabaseUrl(config: ConfigService): string {
  const url = config.get<string>('SUPABASE_URL') ?? config.get<string>('NUXT_PUBLIC_SUPABASE_URL')
  if (!url) {
    throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '服务端未配置鉴权来源' })
  }
  return url.replace(/\/+$/, '')
}
