import type { Request } from 'express'

/**
 * 验证通过后的请求身份（从 JWT payload 提取，见 JwtVerifierService）。
 * 仅服务端内部消费，不进 packages/types——跨端契约才进 types 包。
 */
export interface AuthenticatedUser {
  /** 用户唯一 UUID（JWT claim `sub`） */
  id: string
  email?: string
  /** Postgres 角色（claim `role`），恒为 authenticated */
  role: string
}

/** Guard 验证通过后把身份挂到 express Request 上 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}
