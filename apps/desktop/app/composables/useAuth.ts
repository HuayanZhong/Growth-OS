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
    default:
      return error.message
  }
}
