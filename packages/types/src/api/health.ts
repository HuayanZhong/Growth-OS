/**
 * Health 域 HTTP 契约（基础设施探针，@Public 无需鉴权）。
 *
 * K8s 双探针：liveness 无外部依赖；readiness 校验 DB 连通性（失败 503 +
 * ApiErrorEnvelope 错误信封，不走成功信封）。
 */
import type { HttpEndpoint } from './http.ts'

export interface HealthApiMap {
  'GET /health/liveness': HttpEndpoint<'GET', undefined, { status: 'ok' }>
  'GET /health/readiness': HttpEndpoint<
    'GET',
    undefined,
    { status: 'ok'; db: 'connected'; latencyMs: number }
  >
  /** 向后兼容，等价 readiness */
  'GET /health': HttpEndpoint<
    'GET',
    undefined,
    { status: 'ok'; db: 'connected'; latencyMs: number }
  >
}
