import { INestApplication } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import request from 'supertest'
import { createE2EApp } from './e2e-app.ts'

/**
 * 鉴权探针 e2e（M1 验收）：
 * - 无 token → 401 信封
 * - 根 .env 测试账号真实登录取 token → 200 且返回同一用户
 * 凭据缺失（CI）时跳过真实登录用例，401 分支仍执行。
 * 凭据只从环境变量读取，禁止硬编码（见 .trae/rules/frontend/auth/credentials.md）。
 */
const EMAIL = process.env.SUPABASE_TEST_EMAIL
const PASSWORD = process.env.SUPABASE_TEST_PASSWORD
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const ANON_KEY = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

// 凭据齐全才跑真实登录用例；先赋值再调用，避免 it(...) 后换行接 ( 的 ASI 解析问题
const describeReal = EMAIL && PASSWORD && SUPABASE_URL && ANON_KEY ? describe : describe.skip

describe('GET /api/v1/auth/me (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createE2EApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('无 Authorization 头：401 + UNAUTHORIZED 信封', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('伪造 token：401（JWKS 验签拒绝）', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt')
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' })
  })

  describeReal('有效 token（需根 .env 测试账号）', () => {
    it('返回当前登录用户，sub 与 Supabase 会话一致', async () => {
      const supabase = createClient(SUPABASE_URL!, ANON_KEY!)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: EMAIL!,
        password: PASSWORD!,
      })
      expect(error).toBeNull()
      const accessToken = data.session!.access_token

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(data.user!.id)
      expect(res.body.email).toBe(EMAIL)
    })
  })
})
