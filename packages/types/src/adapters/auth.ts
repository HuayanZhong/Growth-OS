/**
 * Auth 能力适配器契约（迭代计划 2.1）。
 *
 * 抽象身份认证能力：现实现为 Supabase Auth（useAuth/useSupabase），
 * 换供应商时只需替换注册项。apiFetch 的 access_token 即来自
 * getAccessToken()。
 */

/** 邮箱 + 密码凭证（约束复用 packages/types auth.ts 的 zod schema 校验） */
export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email?: string
}

export interface AuthSession {
  /** 自有后端请求携带的 Bearer token */
  accessToken: string
  user: AuthUser
  /** 过期时间（epoch 毫秒）；刷新型会话可能无法给出，允许缺省 */
  expiresAt?: number
}

export interface AuthAdapter {
  /** 登录；凭证错误 reject */
  signInWithPassword(credentials: AuthCredentials): Promise<AuthSession>
  /**
   * 注册。返回 null 表示需要邮箱确认后才算登录（对齐 auth flows 规则：
   * 注册后无 session → 展示确认页，不视为错误）。
   */
  signUpWithPassword(credentials: AuthCredentials): Promise<AuthSession | null>
  signOut(): Promise<void>
  /** 当前会话；无有效会话返回 null（过期/未登录，失败即按登出处理） */
  getSession(): Promise<AuthSession | null>
  /** 当前 access token；无有效会话返回 null */
  getAccessToken(): Promise<string | null>
  /**
   * 订阅会话变化（token 刷新、登出、其他端点登出），返回取消订阅函数。
   * 可选：实现方无推送机制时可缺省，调用方轮询 getSession 兜底。
   */
  onSessionChange?(listener: (session: AuthSession | null) => void): () => void
}
