import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './e2e-app.ts'

describe('GET /api/v1/health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createE2EApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('公开端点：无 token 返回 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
