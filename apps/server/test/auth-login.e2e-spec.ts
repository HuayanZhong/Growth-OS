import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createE2EApp } from './e2e-app.ts'

/**
 * 登录端点 e2e：
 * - 缺字段 → 400 VALIDATION_ERROR 信封（无需外部服务）；
 * - 错误密码 → 401；真实测试账号登录 → 200 且返回可用的 access token。
 * 凭据缺失（CI）时跳过真实登录用例，校验分支仍执行。
 * 凭据只从环境变量读取，禁止硬编码（见 .trae/rules/frontend/auth/credentials.md）。
 */
const EMAIL = process.env.SUPABASE_TEST_EMAIL
const PASSWORD = process.env.SUPABASE_TEST_PASSWORD
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const ANON_KEY = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

// 凭据齐全才跑真实登录用例；先赋值再调用，避免 it(...) 后换行接 ( 的 ASI 解析问题
const describeReal = EMAIL && PASSWORD && SUPABASE_URL && ANON_KEY ? describe : describe.skip

describe('POST /api/v1/auth/login (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createE2EApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('缺字段：400 + VALIDATION_ERROR 信封', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('malformed JSON：400 + BAD_REQUEST + 固定中文文案（body-parser 解析错误转译，不透出 JSON.parse 原文）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      // 全角逗号使 JSON.parse 失败（解析先于 zod 校验，不触外部服务）
      .send('{"email": "a@b.com"，}')
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST', message: '请求体不是合法的 JSON' })
  })

  describeReal('真实 Supabase 凭据', () => {
    it('错误密码：401 + UNAUTHORIZED 信封', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: 'definitely-wrong-password' })
      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('测试账号登录：200 返回精简 token，user.id 与 Supabase 一致', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })

      expect(res.status).toBe(200)
      // ResponseEnvelopeInterceptor 包装成功响应为 { data: T }
      expect(res.body.data.accessToken).toBeTruthy()
      expect(res.body.data.tokenType).toBe('bearer')
      expect(res.body.data.expiresIn).toBeGreaterThan(0)
      expect(res.body.data.user.email).toBe(EMAIL)
      // 精简契约：refresh_token 不透传
      expect(res.body.data.refreshToken).toBeUndefined()
    })
  })
})
