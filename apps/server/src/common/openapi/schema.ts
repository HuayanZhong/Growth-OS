/**
 * OpenAPI schema 构建工具（供 @nestjs/swagger 装饰器消费）。
 *
 * 背景：server 的请求/响应类型是 TS type（运行时擦除），@nestjs/swagger 无法
 * 反射出 schema，文档只剩空壳。zod v4 自带 toJSONSchema，因此契约里的 zod
 * schema（@growth-os/types）就是 schema 的运行时来源，无需第三方转换库。
 */
import { applyDecorators } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger'
import type { SchemaObject } from '@nestjs/swagger'
import { toJSONSchema } from 'zod'
import type { ZodType } from 'zod'

/**
 * zod schema → OpenAPI 3.0 Schema Object。
 * - target 'openapi-3.0'：与 @nestjs/swagger 产出的文档版本一致
 * - io 'input' 用于请求体（.optional() 字段不进 required），'output' 用于响应体
 * - unrepresentable 'any'：无法表达的类型降级为开放 schema 而非抛错
 */
export function toOpenApiSchema(schema: ZodType, io: 'input' | 'output' = 'input'): SchemaObject {
  return toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  }) as SchemaObject
}

/** 业务数据数组 schema（列表端点的 data 内容）。 */
export function arrayOf(item: SchemaObject): SchemaObject {
  return { type: 'array', items: item }
}

/** 成功信封 schema：ResponseEnvelopeInterceptor 把业务数据包装为 { data: T }。 */
function dataEnvelope(business: SchemaObject): SchemaObject {
  return { type: 'object', properties: { data: business }, required: ['data'] }
}

/** 200 成功响应（信封包裹业务 schema）。 */
export function ApiDataOk(business: SchemaObject, description: string) {
  return ApiOkResponse({ description, schema: dataEnvelope(business) })
}

/** 201 成功响应（POST 创建，Nest 默认 201）。 */
export function ApiDataCreated(business: SchemaObject, description: string) {
  return ApiCreatedResponse({ description, schema: dataEnvelope(business) })
}

/** ApiErrorEnvelope schema（AllExceptionsFilter 归一化的统一错误信封）。 */
const apiErrorEnvelopeSchema: SchemaObject = {
  type: 'object',
  properties: {
    code: {
      type: 'string',
      description: '机器可读错误码（SCREAMING_SNAKE_CASE，如 NOT_FOUND / VALIDATION_ERROR）',
    },
    message: { type: 'string', description: '面向用户的可读文案' },
    details: {
      description: '结构化补充信息（如 VALIDATION_ERROR 的字段级 issue 列表）',
    },
  },
  required: ['code', 'message'],
}

/** 各状态码的语义（code 由 AllExceptionsFilter 的 STATUS_CODE_MAP 决定）。 */
const API_ERROR_DESCRIPTIONS = {
  '400': '请求参数校验失败（VALIDATION_ERROR，details 含字段级 issue）',
  '401': '缺少或无效的 Bearer token（UNAUTHORIZED）',
  '403': '无权访问该资源（FORBIDDEN）',
  '404': '资源不存在（NOT_FOUND）',
  '409': '资源状态冲突（CONFLICT）',
  '429': '触发限流（RATE_LIMITED）',
  '500': '服务器内部错误（INTERNAL_ERROR）',
  '501': '能力尚未实现（NOT_IMPLEMENTED）',
  '503': '依赖服务不可用（SERVICE_UNAVAILABLE）',
} as const

export type ApiErrorStatus = keyof typeof API_ERROR_DESCRIPTIONS

/** 按状态码批量挂错误响应装饰器（统一 ApiErrorEnvelope schema），如 @ApiErrorResponses('401', '404')。 */
export function ApiErrorResponses(...statuses: ApiErrorStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status: Number(status),
        description: API_ERROR_DESCRIPTIONS[status],
        schema: apiErrorEnvelopeSchema,
      }),
    ),
  )
}
