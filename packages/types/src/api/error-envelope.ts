/**
 * REST 错误统一信封 —— 所有非 2xx 响应的响应体契约。
 *
 * 约定：
 * - 成功响应返回裸 JSON 数据（不加包装层）；仅错误使用信封
 * - `code` 为机器可读错误码（SCREAMING_SNAKE），前端按码分支处理
 * - `message` 为面向用户的人类可读文案
 * - SSE 流式接口的错误通过 ChatStreamEvent 的 error 事件传递，不使用此信封
 */
export interface ApiErrorEnvelope {
  /** 机器可读错误码，如 VALIDATION_ERROR / NOT_FOUND / INTERNAL_ERROR */
  code: string
  /** 面向用户的可读文案 */
  message: string
  /** 结构化补充信息（如校验失败的字段级 issue 列表） */
  details?: unknown
}
