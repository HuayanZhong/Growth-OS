import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { INestApplication, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Logger } from 'nestjs-pino'
import request from 'supertest'
import type { ChatStreamEvent } from '@growth-os/types'
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter.ts'
import { ChatController } from '../../../src/modules/chat/chat.controller.ts'
import { ChatStreamService } from '../../../src/modules/chat/chat-stream.service.ts'
import { CHAT_TURN } from '../../../src/modules/graph/graph.module.ts'
import type { GraphEvent } from '../../../src/modules/graph/graph-event.ts'

/**
 * HTTP 集成（最小 Nest 应用 + 真实管道/过滤器/守卫链，mock 回合执行器）：
 * - 鉴权失败 → 401 ApiErrorEnvelope（stub 守卫复刻全局 JWT Guard 的拒绝语义，
 *   真实验证链见 supabase-jwt.guard.test 与 auth e2e）；
 * - 请求体非法 → 400 VALIDATION_ERROR envelope（真实 ZodValidationPipe）；
 * - 合法请求 → 200 text/event-stream 帧序（run_started → … → run_finished）。
 */
const turnMock = vi.fn<(input: unknown, signal: AbortSignal) => AsyncIterable<GraphEvent>>()

const VALID_INPUT = {
  agentSlug: 'xiaohuayan',
  messages: [{ role: 'user', content: '你好' }],
}

describe('POST /chat/stream (http)', () => {
  let app: INestApplication

  beforeAll(async () => {
    turnMock.mockImplementation((_input, _signal) =>
      (async function* () {
        const events: GraphEvent[] = [
          { type: 'text_delta', delta: '你' },
          { type: 'text_delta', delta: '好' },
          { type: 'turn_end' },
        ]
        yield* events
      })(),
    )
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatStreamService,
        { provide: CHAT_TURN, useValue: turnMock },
        { provide: Logger, useValue: { error: vi.fn(), log: vi.fn() } },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: {
              switchToHttp: () => {
                getRequest: () => { headers: Record<string, string | undefined> }
              }
            }) => {
              const req = context.switchToHttp().getRequest()
              if (!req.headers.authorization) {
                throw new UnauthorizedException('未登录或登录已过期')
              }
              return true
            },
          },
        },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('缺 JWT → 401 ApiErrorEnvelope 且不建立流', async () => {
    const res = await request(app.getHttpServer()).post('/chat/stream').send(VALID_INPUT)

    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', message: '未登录或登录已过期' })
    expect(res.headers['content-type']).not.toContain('text/event-stream')
  })

  it('请求体非法 → 400 VALIDATION_ERROR envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/chat/stream')
      .set('Authorization', 'Bearer test-token')
      .send({ messages: 'not-an-array' })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(Array.isArray(res.body.details)).toBe(true)
  })

  it('合法请求 → 200 SSE 帧序：run_started → start → content* → end → run_finished', async () => {
    const res = await request(app.getHttpServer())
      .post('/chat/stream')
      .set('Authorization', 'Bearer test-token')
      .send(VALID_INPUT)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const frames = res.text
      .split('\n\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice('data: '.length)) as ChatStreamEvent)

    expect(frames.map((frame) => frame.type)).toEqual([
      'run_started',
      'text_message_start',
      'text_message_content',
      'text_message_content',
      'text_message_end',
      'run_finished',
    ])
    const contents = frames.filter((frame) => frame.type === 'text_message_content')
    expect(contents.map((frame) => (frame as { delta: string }).delta).join('')).toBe('你好')
  })
})
