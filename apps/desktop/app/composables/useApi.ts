import type { ApiErrorEnvelope, ApiSuccess } from '@growth-os/types'
import type { SupabaseClient } from '@supabase/supabase-js'

/** 后端错误：携带状态码与信封错误码，UI 层据此分流（401 由本模块统一出口接管） */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.message)
    this.name = 'ApiError'
    this.status = status
    this.code = envelope.code
    if (envelope.details !== undefined) this.details = envelope.details
  }
}

// —— 统一认证失效出口（并发 in-flight 去重）——
// 去重窗口随处置 Promise 结束而关闭：并发 401 共享同一次登出跳转，
// 用户重新登录后的下一次失效可再次触发完整流程（无永久标志）

// 本地登出 + 回登录页：scope:'local' 不请求服务端（会话已死，对齐 auth flows 降级纪律），
// 登出异常不阻断导航——保证用户一定能离开死会话
let authExitInFlight: Promise<void> | null = null

function localSignOutAndExit(supabase: SupabaseClient): Promise<void> {
  authExitInFlight ??= (async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    await navigateTo('/auth')
  })().finally(() => {
    authExitInFlight = null
  })
  return authExitInFlight
}

// 401 处置：显式刷新一次（休眠唤醒后 autoRefreshToken 定时器不可依赖，直接登出会误杀
// 可恢复会话）；刷新成功返回 true（调用方自动重试），失败走登出出口返回 false。
// 并发 401 共享同一次刷新，避免重复刷新与重复登出跳转
let refreshInFlight: Promise<boolean> | null = null

function recoverAuth(supabase: SupabaseClient): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) return true
    await localSignOutAndExit(supabase)
    return false
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/** 单次带鉴权发送（apiFetch / apiStream 共用）：token 注入 + JSON 序列化 */
async function authorizedSend(
  supabase: SupabaseClient,
  path: string,
  options: ApiFetchOptions,
): Promise<Response> {
  const base = (useRuntimeConfig().public.apiBaseUrl ?? '').replace(/\/+$/, '')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    await localSignOutAndExit(supabase)
    throw new ApiError(401, { code: 'UNAUTHORIZED', message: '未登录或登录已过期' })
  }
  return fetch(`${base}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      // FormData（multipart 上传）原样透传，Content-Type（含 boundary）交由浏览器生成
      ...(options.body !== undefined && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    signal: options.signal,
  })
}

/**
 * 自有后端 API 的唯一请求入口：
 * - 自动从 supabase-js 会话取 access_token 拼 Authorization 头（token.md 规则的
 *   唯一例外点——Supabase API 由 supabase-js 自动注入，自有后端必须手动携带）；
 * - 401 统一出口：先 refreshSession 并自动重试原请求一次，刷新失败则本地登出并
 *   回登录页（并发 401 共享同一次处置）；5xx/网络异常/其他 4xx 不触发登出与跳转；
 * - 非 2xx 统一解析 ApiErrorEnvelope 并抛 ApiError；
 * - 成功响应解包 ResponseEnvelopeInterceptor 的 { data: T } 信封，调用方直取业务
 *   数据（T 即 packages/types 各域契约里的 response 类型）。
 * 服务端地址来自 NUXT_PUBLIC_API_BASE_URL（nuxt.config runtimeConfig）。
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const supabase = useSupabase()

  let response = await authorizedSend(supabase, path, options)
  if (response.status === 401) {
    // 统一 401 出口：刷新成功 → 自动重试一次（重试再 401 不再处置，防循环）；
    // 刷新失败 → 已本地登出并回登录页，抛错终结调用方等待
    const recovered = await recoverAuth(supabase)
    if (!recovered) {
      throw new ApiError(401, { code: 'SESSION_EXPIRED', message: '登录已失效，请重新登录' })
    }
    response = await authorizedSend(supabase, path, options)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null
    throw new ApiError(
      response.status,
      payload?.code && payload.message
        ? payload
        : { code: `HTTP_${response.status}`, message: '请求失败，请稍后重试' },
    )
  }
  // 解包成功信封 { data: T }（ResponseEnvelopeInterceptor 全局包装，204 除外）
  const payload = (await response.json()) as ApiSuccess<T>
  return payload.data
}

interface ApiStreamOptions {
  body?: unknown
  signal?: AbortSignal
}

/**
 * SSE 流式请求入口（数据面，如 POST /chat/stream）：
 * - 与 apiFetch 共用 token 注入、401 单次刷新重试与鉴权降级出口、错误信封解析；
 * - 不解包成功信封——流式响应不走 ResponseEnvelopeInterceptor，返回原始
 *   Response，响应体由调用方按流消费（SSE 帧解析见 app/utils/sse.ts）。
 */
export async function apiStream(path: string, options: ApiStreamOptions = {}): Promise<Response> {
  const supabase = useSupabase()

  let response = await authorizedSend(supabase, path, {
    method: 'POST',
    body: options.body,
    signal: options.signal,
  })
  if (response.status === 401) {
    const recovered = await recoverAuth(supabase)
    if (!recovered) {
      throw new ApiError(401, { code: 'SESSION_EXPIRED', message: '登录已失效，请重新登录' })
    }
    response = await authorizedSend(supabase, path, {
      method: 'POST',
      body: options.body,
      signal: options.signal,
    })
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null
    throw new ApiError(
      response.status,
      payload?.code && payload.message
        ? payload
        : { code: `HTTP_${response.status}`, message: '请求失败，请稍后重试' },
    )
  }
  return response
}
