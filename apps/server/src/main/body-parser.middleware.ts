import { BadRequestException } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { json, urlencoded } from 'express'
import type { NextFunction, RequestHandler, Request, Response } from 'express'

/**
 * 请求体解析中间件注册（替代 Nest 默认 bodyParser）。
 *
 * 问题背景：
 *   Nest 默认 json/urlencoded 解析失败时，把 JSON.parse 的英文原文（如
 *   "Expected ',' or '}' after property value in JSON at position 35"）直接
 *   透给客户端 message——code 契约正常（BAD_REQUEST），但文案是人看的那一行，
 *   不该暴露 V8 内部报错细节。
 *
 * 设计要点：
 *   - body-parser 解析失败错误带文档化契约 type: 'entity.parse.failed'（见
 *     body-parser README），据此精准识别，不做 message 文案模式匹配（跨 Node
 *     版本不稳定）；
 *   - 转译为统一错误信封文案，code 不变（仍为 BAD_REQUEST），message 固定中文；
 *   - 与 Nest 默认 bodyParser 行为对齐：json + urlencoded，limit 同默认 100kb，
 *     仅替换错误文案，不改解析能力。
 */

/** body-parser 解析失败错误的 type 标识 */
const PARSE_FAILED_TYPE = 'entity.parse.failed'

/** 请求体不是合法 JSON 时的固定文案（message 非契约，前端只认 code） */
export const MALFORMED_JSON_MESSAGE = '请求体不是合法的 JSON'

/** 包装解析器：解析失败错误转译为统一信封，其余错误（如实体过大）原样上抛 */
function translateParseError(parser: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    parser(req, res, (err?: unknown) => {
      const type = err instanceof Error ? (err as { type?: unknown }).type : undefined
      if (type === PARSE_FAILED_TYPE) {
        next(new BadRequestException({ code: 'BAD_REQUEST', message: MALFORMED_JSON_MESSAGE }))
        return
      }
      next(err)
    })
  }
}

export function registerBodyParsers(app: INestApplication): void {
  app.use(translateParseError(json({ limit: '100kb' })))
  app.use(translateParseError(urlencoded({ extended: true, limit: '100kb' })))
}
