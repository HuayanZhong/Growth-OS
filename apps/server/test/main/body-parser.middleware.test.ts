import { Readable } from 'node:stream'
import type { INestApplication } from '@nestjs/common'
import { BadRequestException } from '@nestjs/common'
import type { Request, RequestHandler, Response } from 'express'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerBodyParsers } from '../../src/main/body-parser.middleware.ts'

/** 通过 registerBodyParsers 拿到实际注册的两个包装中间件（json、urlencoded） */
function setup(): { json: RequestHandler; urlencoded: RequestHandler } {
  const app = { use: vi.fn() }
  registerBodyParsers(app as unknown as INestApplication)
  const handlers = app.use.mock.calls.map((call) => call[0] as RequestHandler)
  return { json: handlers[0] as RequestHandler, urlencoded: handlers[1] as RequestHandler }
}

/** 构造可被 body-parser 消费的流式 mock req；body 延迟到 nextTick 再推入，确保监听器已挂载 */
function makeRequest(raw: string, headers: Record<string, string>): Request {
  const req = new Readable({ read() {} }) as unknown as Request
  Object.assign(req, {
    // body-parser 2 无 content-length 头会跳过解析，mock 必须带真实长度
    headers: { 'content-length': String(Buffer.byteLength(raw)), ...headers },
    method: 'POST',
  })
  process.nextTick(() => {
    const stream = req as unknown as Readable
    if (raw.length > 0) stream.push(raw)
    stream.push(null)
  })
  return req
}

/** body-parser 非 parse.failed 错误的形状（HTTPError 带 type/status） */
type HttpParseError = Error & { type?: string; status?: number }

describe('body-parser 转译中间件', () => {
  let middleware: RequestHandler
  const res = {} as Response

  beforeEach(() => {
    middleware = setup().json
  })

  const run = (req: Request): Promise<unknown[]> =>
    new Promise((resolve) => {
      middleware(req, res, (...args: unknown[]) => resolve(args))
    })

  it('合法 JSON：next 无错误且 req.body 回填', async () => {
    const req = makeRequest('{"email":"a@b.c"}', { 'content-type': 'application/json' })
    const args = await run(req)
    expect(args[0]).toBeUndefined()
    expect((req as { body?: unknown }).body).toEqual({ email: 'a@b.c' })
  })

  it('非法 JSON：转译为 BadRequestException，code BAD_REQUEST、固定中文文案', async () => {
    const req = makeRequest('{"email":', { 'content-type': 'application/json' })
    const args = await run(req)
    expect(args).toHaveLength(1)
    const err = args[0] as BadRequestException
    expect(err).toBeInstanceOf(BadRequestException)
    expect(err.getStatus()).toBe(400)
    expect(err.message).toBe('请求体不是合法的 JSON')
    expect((err.getResponse() as { code?: string }).code).toBe('BAD_REQUEST')
  })

  it('非 JSON content-type：parser 直接跳过，next 无错误', async () => {
    const req = makeRequest('hello', { 'content-type': 'text/plain' })
    const args = await run(req)
    expect(args[0]).toBeUndefined()
  })

  it('实体过大：非 parse.failed 错误原样上抛，不改写文案', async () => {
    middleware = setup().urlencoded
    const req = makeRequest('', {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': String(200 * 1024),
    })
    const args = await run(req)
    expect(args).toHaveLength(1)
    const err = args[0] as HttpParseError
    expect(err).not.toBeInstanceOf(BadRequestException)
    expect(err.type).toBe('entity.too.large')
    expect(err.status).toBe(413)
  })
})
