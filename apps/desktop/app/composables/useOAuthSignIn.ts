import type { AuthError } from '@supabase/supabase-js'
import {
  OAUTH_WINDOW_BUSY,
  OAUTH_WINDOW_CANCELLED,
  OAUTH_WINDOW_INVALID_REQUEST,
  OAUTH_WINDOW_NAVIGATION_DENIED,
  OAUTH_WINDOW_TIMEOUT,
} from '@growth-os/types'

/** 本地预检失败码：provider 在 Supabase 侧未启用（实测 authorize 端点会返回 400 裸 JSON，必须提前拦截） */
export const OAUTH_PROVIDER_DISABLED = 'oauth_provider_disabled'

/**
 * OAuth 授权窗口错误码 -> 中文提示。
 * 错误码契约见 @growth-os/types 的 oauthWindow 通道（主进程 reject 的 message）。
 */
const OAUTH_WINDOW_ERRORS: Record<string, string> = {
  [OAUTH_WINDOW_CANCELLED]: '授权窗口已关闭，已取消登录',
  [OAUTH_WINDOW_TIMEOUT]: '授权超时，请重试',
  [OAUTH_WINDOW_NAVIGATION_DENIED]: '授权页面加载失败，请检查网络后重试',
  [OAUTH_WINDOW_BUSY]: '已有授权窗口在进行中',
  [OAUTH_WINDOW_INVALID_REQUEST]: '授权参数错误',
  [OAUTH_PROVIDER_DISABLED]: '该第三方登录暂未开放，请使用邮箱登录',
}

/** GitHub 授权流程允许的额外导航域（授权页所在的 github.com） */
const GITHUB_ALLOWED_HOSTS = ['github.com']

/**
 * 预检 provider 是否已在 Supabase 侧启用（公开的 /auth/v1/settings，anon key 即可）。
 * 未启用时抛 OAUTH_PROVIDER_DISABLED，避免导航后停在裸 JSON 错误页。
 * 预检请求自身失败（网络抖动等）视为启用——放行走原流程，由真实授权环节自然报错。
 */
async function ensureProviderEnabled(provider: string): Promise<void> {
  try {
    const { supabaseUrl, supabaseAnonKey } = useRuntimeConfig().public
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
    })
    if (!res.ok) return
    const settings = (await res.json()) as { external?: Record<string, boolean> }
    if (settings.external?.[provider] !== true) {
      throw new Error(OAUTH_PROVIDER_DISABLED)
    }
  } catch (err) {
    if (err instanceof Error && err.message === OAUTH_PROVIDER_DISABLED) throw err
    // 预检自身失败：放行，不在预检处制造新失败模式
  }
}

/**
 * 第三方 OAuth 登录：signInWithOAuth 生成授权 URL → 授权窗口拦截回调 →
 * PKCE code 换会话。成功后 session 由 supabase-js 经 secureStorage 自动持久化，
 * 与邮箱密码登录完全同构。
 *
 * 纯浏览器环境（web 预览，无 Electron preload）降级为整页跳转授权，
 * 由 /auth 页的 detectSessionInUrl + PKCE 自动完成会话交换。
 */
export function useOAuthSignIn() {
  const supabase = useSupabase()

  const signInWithProvider = async (provider: 'github'): Promise<void> => {
    const { siteUrl } = useRuntimeConfig().public
    const redirectTo = `${siteUrl}/auth`

    // 预检：provider 未启用时不发起授权（避免停在 Supabase 裸 JSON 400 错误页）
    await ensureProviderEnabled(provider)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (!data.url) throw new Error('oauth_missing_authorize_url')

    // 纯浏览器：整页跳转，回调后 detectSessionInUrl 完成 PKCE 交换
    if (!isElectron()) {
      window.location.assign(data.url)
      return
    }

    const { callbackUrl } = await window.desktop.oauthWindow({
      authUrl: data.url,
      callbackOrigin: redirectTo,
      allowedHosts: GITHUB_ALLOWED_HOSTS,
    })

    const code = new URL(callbackUrl).searchParams.get('code')
    if (!code) throw new Error('oauth_missing_code')

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) throw exchangeError
  }

  return { signInWithProvider }
}

/**
 * OAuth 登录错误 -> 中文提示：
 * 窗口错误码走映射表（Electron invoke reject 会给 message 加
 * "Error invoking remote method 'oauthWindow': Error: " 前缀，故按后缀匹配）；
 * Supabase AuthError 复用 mapAuthError；其余兜底。
 */
export function mapOAuthSignInError(error: unknown): string {
  if (!(error instanceof Error)) return '第三方登录失败，请稍后重试'
  const hit = Object.entries(OAUTH_WINDOW_ERRORS).find(
    ([key]) => error.message === key || error.message.endsWith(key),
  )
  if (hit) return hit[1]
  // supabase-js 的 AuthError 家族 name 均以 Auth 开头（AuthError/AuthApiError/...）
  if (error.name.startsWith('Auth')) return mapAuthError(error as AuthError)
  return '第三方登录失败，请稍后重试'
}
