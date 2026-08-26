import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'

/** 允许的非对称签名算法（走 JWKS 本地验签） */
const ASYMMETRIC_ALGS = new Set([
  'ES256',
  'ES384',
  'ES512',
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'EdDSA',
])

/** 时钟偏移容忍（秒）：分布式时钟漂移下不误杀刚签发的 token */
const CLOCK_TOLERANCE_SECONDS = 30

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({ code: 'UNAUTHORIZED', message: '未登录或登录已过期' })
}

/**
 * Supabase JWT 双轨验证（官方《Verifying a JWT》指南姿势）：
 * - ES256/RS256 等（Signing keys 项目）：本地 JWKS 公钥验签，零网络往返，
 *   密钥轮换由 jose 缓存自动跟随；
 * - HS256（legacy 共享密钥项目）：官方强烈反对本地验签（持密钥即可伪造），
 *   改调 Auth 服务器 GET /auth/v1/user 探针校验。
 * 设计细节见 .trae/documents/auth-verification-design.md 第四节。
 */
@Injectable()
export class JwtVerifierService {
  private readonly logger = new Logger(JwtVerifierService.name)
  private jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null
  private jwksUrl = ''

  constructor(private readonly config: ConfigService) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    let alg: string | undefined
    try {
      alg = decodeProtectedHeader(token).alg
    } catch {
      throw unauthorized()
    }
    if (!alg || (alg !== 'HS256' && !ASYMMETRIC_ALGS.has(alg))) {
      throw unauthorized()
    }
    return alg === 'HS256' ? this.verifyViaAuthServer(token) : this.verifyViaJwks(token)
  }

  /** 主路径：非对称密钥，本地 JWKS 验签（官方示例代码） */
  private async verifyViaJwks(token: string): Promise<AuthenticatedUser> {
    const url = this.supabaseUrl()
    if (!this.jwksCache || this.jwksUrl !== url) {
      this.jwksCache = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`))
      this.jwksUrl = url
    }
    let payload: JWTPayload
    try {
      ;({ payload } = await jwtVerify(token, this.jwksCache, {
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      }))
    } catch (err) {
      // 验签失败属预期拒绝路径，warn 级别记录原因但不泄露给客户端
      this.logger.warn(`JWT 验签失败: ${err instanceof Error ? err.message : String(err)}`)
      throw unauthorized()
    }
    return this.toUser(payload)
  }

  /** 回退路径：HS256 legacy，转问签发者本人（官方推荐探针方式） */
  private async verifyViaAuthServer(token: string): Promise<AuthenticatedUser> {
    const url = this.supabaseUrl()
    const anonKey = this.config.get<string>('NUXT_PUBLIC_SUPABASE_ANON_KEY')
    if (!anonKey) throw unauthorized()
    let res: Response
    try {
      res = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      })
    } catch {
      // 网络不可达时按未认证处理：验证不了 ≠ 服务端故障，不应放大为 500
      throw unauthorized()
    }
    if (!res.ok) throw unauthorized()
    // 探针通过即证明 token 有效且未过期，此时安全解码 payload 取 claims
    try {
      return this.toUser(decodeJwt(token))
    } catch {
      throw unauthorized()
    }
  }

  /** URL 解析链：SUPABASE_URL → NUXT_PUBLIC_SUPABASE_URL → 拒绝 */
  private supabaseUrl(): string {
    const url =
      this.config.get<string>('SUPABASE_URL') ?? this.config.get<string>('NUXT_PUBLIC_SUPABASE_URL')
    if (!url) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '服务端未配置鉴权来源' })
    }
    return url.replace(/\/+$/, '')
  }

  private toUser(payload: JWTPayload): AuthenticatedUser {
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw unauthorized()
    return {
      id: payload.sub,
      // exactOptionalPropertyTypes 下不给可选属性显式赋 undefined，用条件展开
      ...(typeof payload.email === 'string' && payload.email.length > 0
        ? { email: payload.email }
        : {}),
      role:
        typeof payload.role === 'string' && payload.role.length > 0
          ? payload.role
          : 'authenticated',
    }
  }
}
