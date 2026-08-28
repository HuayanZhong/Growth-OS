import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './e2e-app.ts'

/**
 * 健康探针 e2e：
 * - liveness：无外部依赖，始终 200（e2e 不引 MikroORM，readiness 会因无 DB 连接返回 503）。
 * - readiness：e2e 环境无真实 DB，预期 503 + SERVICE_UNAVAILABLE。
 * - ResponseEnvelopeInterceptor 已注册，200 响应被包装为 { data: T }。
 */
describe('Health probes (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createE2EApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/health/liveness → 200（无外部依赖）', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/liveness')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: { status: 'ok' } })
  })

  it('GET /api/v1/health → 503（e2e 无真实 DB 连接）', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health')
    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })

  it('GET /api/v1/health/readiness → 503（同上）', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/readiness')
    expect(res.status).toBe(503)
  })
})
