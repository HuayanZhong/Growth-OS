import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { LoginInput, LoginResult } from '@growth-os/types'
import { resolveSupabaseUrl } from './supabase-url.ts'

/** Supabase Auth password grant 的响应形状（GoTrue 契约，只取本服务消费的字段） */
interface SupabaseTokenResponse {
  access_token?: unknown
  token_type?: unknown
  expires_in?: unknown
  refresh_token?: unknown
  user?: { id?: unknown; email?: unknown }
}

function loginFailed(message: string): UnauthorizedException {
  return new UnauthorizedException({ code: 'UNAUTHORIZED', message })
}

/**
 * 登录服务：代理 Supabase Auth 的 password grant。
 * 自有后端不落库、不自行签发 token——身份仍由 Supabase 签发，
 * 成功后只映射 Authorization 头需要的最小字段（见 LoginResult 契约），
 * refresh_token / user metadata 不透传。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(private readonly config: ConfigService) {}

  async signInWithPassword(dto: LoginInput): Promise<LoginResult> {
    const url = resolveSupabaseUrl(this.config)
    const anonKey = this.config.get<string>('NUXT_PUBLIC_SUPABASE_ANON_KEY')
    if (!anonKey) throw loginFailed('服务端未配置鉴权来源')

    let res: Response
    try {
      res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: dto.email, password: dto.password }),
      })
    } catch (err) {
      // 上游不可达属依赖故障，warn 记录真实原因；客户端只看到统一的登录失败文案
      this.logger.warn(`登录代理请求失败: ${err instanceof Error ? err.message : String(err)}`)
      throw loginFailed('登录失败，请稍后重试')
    }

    if (!res.ok) {
      // 400 = 凭据错误（可安全区分）；其余（403/429/5xx）统一模糊文案，不泄露上游细节
      this.logger.warn(`登录被 Supabase 拒绝: status=${res.status}`)
      throw loginFailed(res.status === 400 ? '邮箱或密码不正确' : '登录失败，请稍后重试')
    }

    let body: SupabaseTokenResponse
    try {
      body = (await res.json()) as SupabaseTokenResponse
    } catch {
      throw loginFailed('登录失败，请稍后重试')
    }

    // access_token / user.id 是本契约的硬性字段，缺失视为上游异常响应
    const accessToken = typeof body.access_token === 'string' ? body.access_token : ''
    const userId = typeof body.user?.id === 'string' ? body.user.id : ''
    if (accessToken.length === 0 || userId.length === 0) {
      this.logger.warn('Supabase 登录响应缺少 access_token / user.id')
      throw loginFailed('登录失败，请稍后重试')
    }

    const email =
      typeof body.user?.email === 'string' && body.user.email.length > 0
        ? body.user.email
        : undefined
    return {
      accessToken,
      tokenType:
        typeof body.token_type === 'string' && body.token_type.length > 0
          ? body.token_type
          : 'bearer',
      expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 3600,
      // exactOptionalPropertyTypes：可选属性用条件展开，不显式赋 undefined
      user: email === undefined ? { id: userId } : { id: userId, email },
    }
  }
}
