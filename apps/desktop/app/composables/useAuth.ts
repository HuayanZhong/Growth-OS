import type { AuthError, Session } from '@supabase/supabase-js'

/**
 * 认证服务类：封装 Supabase Auth 操作。
 * 方法用箭头函数字段定义，解构后 this 仍指向实例（如 `const { signIn } = useAuth()`）。
 * 错误不在此处吞掉，由调用方按 UI 需要提示；mapAuthError 统一中文映射。
 */
export class AuthService {
  private readonly supabase = useSupabase()

  getSession = async (): Promise<Session | null> => {
    const { data } = await this.supabase.auth.getSession()
    return data.session
  }

  signIn = (email: string, password: string) =>
    this.supabase.auth.signInWithPassword({ email, password })

  signUp = (email: string, password: string) => this.supabase.auth.signUp({ email, password })

  signOut = () => this.supabase.auth.signOut()

  // 强制本地登出：signOut 服务端调用失败（网络中断/异常）时兜底，
  // scope: 'local' 只清本地不请求服务端，保证本地会话一定清除、用户一定能退出
  forceSignOut = () => this.supabase.auth.signOut({ scope: 'local' })

  // 登出（带过期/失败兜底）：
  // - 本地 session 已过期或不存在 → 服务端 session 大概率已失效，直接 scope:'local' 清本地，
  //   不发无谓的 logout 请求（避免 token 过期时每次退出都吃一个 403）
  // - session 仍有效 → 正常调用服务端 logout 吊销 token；失败（403/网络）再降级本地登出
  // 任何路径都保证本地会话清除、用户一定能退出。
  // 返回 errorMessage：有值表示走了降级路径（服务端登出未完成），信息取自接口返回（已中文化），
  // 供调用方提示；无值表示服务端 logout 成功（204 空响应，无成功文案可拿）
  signOutWithFallback = async (): Promise<{ errorMessage?: string }> => {
    const { data } = await this.supabase.auth.getSession()
    const session = data.session
    if (!session || (session.expires_at != null && Date.now() / 1000 >= session.expires_at)) {
      await this.forceSignOut()
      return { errorMessage: '会话已过期或不存在' }
    }
    try {
      const { error } = await this.signOut()
      if (error) {
        await this.forceSignOut()
        return { errorMessage: mapAuthError(error) }
      }
      return {}
    } catch (err) {
      await this.forceSignOut()
      return {
        errorMessage: err instanceof Error ? err.message : '网络异常，本地会话已清除',
      }
    }
  }

  // 重发注册确认邮件（type:'signup' 对应 signUp 的邮箱确认）
  resendConfirmation = (email: string) => this.supabase.auth.resend({ type: 'signup', email })
}

export function useAuth(): AuthService {
  return new AuthService()
}

// Supabase Auth 错误 -> 中文提示
export function mapAuthError(error: AuthError): string {
  // supabase-js v2 的 AuthApiError 暴露 code 字段
  const code = (error as { code?: string }).code
  switch (code) {
    case 'email_not_confirmed':
      return '邮箱未确认，请先点击邮件中的确认链接'
    case 'invalid_credentials':
      return '邮箱或密码错误'
    case 'user_already_exists':
      return '该邮箱已注册'
    case 'over_request_rate_limit':
      return '请求过于频繁，请稍后再试'
    case 'session_not_found':
      return '登录会话已失效，请重新登录'
    default:
      return error.message
  }
}
