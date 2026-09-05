/**
 * HTTP API 契约基建（迭代计划 2.6）。
 *
 * 五个产品域（agents/sessions/skills/files/projects）的端点契约沿用
 * `ipc-channels.ts` 的映射派生模式：key = 'METHOD /path'，value = 端点的
 * method / request / response。契约是前后端唯一耦合点——server 骨架按此
 * 实现 controller，前端 feature 的 typed client 按此声明入参与返回。
 *
 * 信封约定（与 ResponseEnvelopeInterceptor / ApiErrorEnvelope 对称）：
 * - 成功：{ data: Res }（本包的 endpoint `response` 字段只声明业务数据 Res）
 * - 失败：ApiErrorEnvelope { code, message, details? }
 */

/** HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** 成功响应信封：ResponseEnvelopeInterceptor 把 controller 返回值包装为 { data: T } */
export interface ApiSuccess<T> {
  data: T
}

/**
 * 单个 HTTP 端点契约。
 *
 * - `request`：GET 端点为 query 对象；POST/PATCH 为 JSON body；无入参端点为
 *   undefined。路径参数（如 /sessions/:id 的 id）由 typed client 拼接进 path，
 *   不在此重复声明
 * - `response`：业务数据类型——线上响应为 ApiSuccess<Res>，调用方经 apiFetch
 *   解包后直接拿到 Res
 */
export interface HttpEndpoint<M extends HttpMethod, Req, Res> {
  method: M
  request: Req
  response: Res
}

/** 任意端点契约（映射表字段类型） */
export type AnyHttpEndpoint = HttpEndpoint<HttpMethod, unknown, unknown>

/** 从端点契约提取请求类型 */
export type EndpointRequest<E> = E extends { request: infer Req } ? Req : never

/** 从端点契约提取业务响应类型（未含信封） */
export type EndpointResponse<E> = E extends { response: infer Res } ? Res : never

/** 从端点契约提取 HTTP 方法 */
export type EndpointMethod<E> = E extends { method: infer M } ? M : never
