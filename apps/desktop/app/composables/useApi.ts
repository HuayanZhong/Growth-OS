import type { ApiErrorEnvelope, ApiSuccess } from '@growth-os/types'

/** 后端错误：携带状态码与信封错误码，UI 层据此分流（401 → 引导重登） */
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

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * 自有后端 API 的唯一请求入口：
 * - 自动从 supabase-js 会话取 access_token 拼 Authorization 头（token.md 规则的
 *   唯一例外点——Supabase API 由 supabase-js 自动注入，自有后端必须手动携带）；
 * - 非 2xx 统一解析 ApiErrorEnvelope 并抛 ApiError；
 * - 成功响应解包 ResponseEnvelopeInterceptor 的 { data: T } 信封，调用方直取业务
 *   数据（T 即 packages/types 各域契约里的 response 类型）。
 * 服务端地址来自 NUXT_PUBLIC_API_BASE_URL（nuxt.config runtimeConfig）。
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const base = (useRuntimeConfig().public.apiBaseUrl ?? '').replace(/\/+$/, '')
  const { data } = await useSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new ApiError(401, { code: 'UNAUTHORIZED', message: '未登录或登录已过期' })
  }

  const response = await fetch(`${base}/api/v1${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

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
