import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OAUTH_WINDOW_CANCELLED } from '@growth-os/types'
import { mapOAuthSignInError, useOAuthSignIn } from '~/composables/useOAuthSignIn'
/**
 * OAuth 登录 composable 测试。
 *
 * mock 策略（遵守 tests/mock：不触真实服务）：
 * - useSupabase 整体 mock：auth.signInWithOAuth / exchangeCodeForSession 为可控行为
 * - isElectron mock：控制 Electron / 纯浏览器分支（window.location.assign 一并 spy）
 * - window.desktop 桩：oauthWindow 为可控行为（isElectron=true 时才被调用）
 */

// vi.mock 工厂会被提升，mock 函数须置于 vi.hoisted 内避免 TDZ
const { signInWithOAuth, exchangeCodeForSession, oauthWindow, isElectron, locationAssign } =
  vi.hoisted(() => ({
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    oauthWindow: vi.fn(),
    isElectron: vi.fn(() => true),
    locationAssign: vi.fn(),
  }))

vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => ({ auth: { signInWithOAuth, exchangeCodeForSession } }),
}))

vi.mock('~/composables/useSecureStorage', () => ({ isElectron }))

const AUTH_URL =
  'https://placeholder.supabase.co/auth/v1/authorize?provider=github&code_challenge=x'

/** /auth/v1/settings 响应构造（预检用） */
function jsonRes(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

async function loadComposable() {
  // useRuntimeConfig 在 nuxt 测试环境注入真实值（siteUrl 默认 http://localhost:3000）
  const { siteUrl } = useRuntimeConfig().public
  return { signInWithProvider: useOAuthSignIn().signInWithProvider, siteUrl }
}

beforeEach(() => {
  vi.clearAllMocks()
  isElectron.mockReturnValue(true)
  // 预检默认返回 github 已启用（未定制 mock 的用例直接走主流程）
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonRes({ external: { github: true } })),
  )
  vi.spyOn(window.location, 'assign').mockImplementation(locationAssign)
  const win = window as unknown as { desktop?: unknown }
  win.desktop = { secureStore: vi.fn(), oauthWindow }

  signInWithOAuth.mockResolvedValue({ data: { url: AUTH_URL }, error: null })
  oauthWindow.mockResolvedValue({
    callbackUrl: `${useRuntimeConfig().public.siteUrl}/auth?code=c1`,
  })
  exchangeCodeForSession.mockResolvedValue({ data: { session: { user: {} } }, error: null })
})

afterEach(() => {
  delete (window as unknown as { desktop?: unknown }).desktop
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('signInWithProvider（Electron 分支）', () => {
  it('成功路径：oauthWindow 收到授权 URL/回调前缀/GitHub 白名单，code 换会话', async () => {
    const { signInWithProvider, siteUrl } = await loadComposable()
    await signInWithProvider('github')

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: `${siteUrl}/auth`, skipBrowserRedirect: true },
    })
    expect(oauthWindow).toHaveBeenCalledWith({
      authUrl: AUTH_URL,
      callbackOrigin: `${siteUrl}/auth`,
      allowedHosts: ['github.com'],
    })
    expect(exchangeCodeForSession).toHaveBeenCalledWith('c1')
    // 不应发生浏览器跳转
    expect(locationAssign).not.toHaveBeenCalled()
  })

  it('signInWithOAuth 返回 error 时原样抛出，不打开授权窗口', async () => {
    signInWithOAuth.mockResolvedValue({ data: null, error: new Error('provider_error') })
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow('provider_error')
    expect(oauthWindow).not.toHaveBeenCalled()
  })

  it('授权 URL 缺失时抛出 oauth_missing_authorize_url', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: '' }, error: null })
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow('oauth_missing_authorize_url')
  })

  it('授权窗口被取消（错误码）时向上抛出，不换会话', async () => {
    oauthWindow.mockRejectedValue(new Error(OAUTH_WINDOW_CANCELLED))
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow(OAUTH_WINDOW_CANCELLED)
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('回调 URL 缺少 code 时抛出 oauth_missing_code', async () => {
    oauthWindow.mockResolvedValue({
      callbackUrl: `${useRuntimeConfig().public.siteUrl}/auth?error=denied`,
    })
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow('oauth_missing_code')
  })

  it('code 换会话失败时抛出交换错误', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: null, error: new Error('bad_code') })
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow('bad_code')
  })
})

describe('signInWithProvider（纯浏览器分支）', () => {
  it('无 Electron preload 时整页跳转授权 URL，不调用授权窗口', async () => {
    isElectron.mockReturnValue(false)
    const { signInWithProvider } = await loadComposable()

    await signInWithProvider('github')

    expect(locationAssign).toHaveBeenCalledWith(AUTH_URL)
    expect(oauthWindow).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })
})

describe('provider 预检（settings 端点）', () => {
  it('provider 未启用：抛出 oauth_provider_disabled，不调用 signInWithOAuth、不开授权窗口', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonRes({ external: { github: false } }))
    const { signInWithProvider } = await loadComposable()

    await expect(signInWithProvider('github')).rejects.toThrow('oauth_provider_disabled')
    expect(signInWithOAuth).not.toHaveBeenCalled()
    expect(oauthWindow).not.toHaveBeenCalled()
  })

  it('settings 非 2xx（预检失败）：放行走主流程（由真实授权环节自然报错）', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response)
    const { signInWithProvider } = await loadComposable()

    await signInWithProvider('github')
    expect(signInWithOAuth).toHaveBeenCalled()
    expect(oauthWindow).toHaveBeenCalled()
  })

  it('settings 网络异常（预检失败）：放行走主流程', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'))
    const { signInWithProvider } = await loadComposable()

    await signInWithProvider('github')
    expect(signInWithOAuth).toHaveBeenCalled()
  })

  it('oauth_provider_disabled 映射中文提示', () => {
    expect(mapOAuthSignInError(new Error('oauth_provider_disabled'))).toBe(
      '该第三方登录暂未开放，请使用邮箱登录',
    )
  })
})

describe('mapOAuthSignInError', () => {
  it.each([
    [OAUTH_WINDOW_CANCELLED, '授权窗口已关闭，已取消登录'],
    ['oauth_window_timeout', '授权超时，请重试'],
    ['oauth_window_navigation_denied', '授权页面加载失败，请检查网络后重试'],
    ['oauth_window_busy', '已有授权窗口在进行中'],
  ])('窗口错误码 %s 映射中文提示', (code, expected) => {
    expect(mapOAuthSignInError(new Error(code))).toBe(expected)
  })

  it('Electron invoke 前缀包裹的错误码同样映射（ipcMain.handle reject 序列化加前缀）', () => {
    const prefixed = new Error(
      "Error invoking remote method 'oauthWindow': Error: oauth_window_cancelled",
    )
    expect(mapOAuthSignInError(prefixed)).toBe('授权窗口已关闭，已取消登录')
  })

  it('Supabase AuthError 复用 mapAuthError 的中文映射', () => {
    const authError = Object.assign(new Error('Invalid login credentials'), {
      name: 'AuthApiError',
      code: 'invalid_credentials',
    })
    expect(mapOAuthSignInError(authError)).toBe('邮箱或密码错误')
  })

  it('未知错误兜底中文提示（非 Error / 未知 Error）', () => {
    expect(mapOAuthSignInError(undefined)).toBe('第三方登录失败，请稍后重试')
    expect(mapOAuthSignInError(new Error('something else'))).toBe('第三方登录失败，请稍后重试')
  })
})
