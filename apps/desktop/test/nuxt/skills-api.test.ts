import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Skill } from '@growth-os/types'
import { skillsApi } from '~/features/skills/api'
import { ApiError } from '~/composables/useApi'

/**
 * Skill 域 typed client 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch，同 agents-api.test.ts），断言各端点的路径拼接、方法、body
 * 与信封解包是否符合 SkillsApiMap 契约。
 */
const mocks = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
  },
}))

mockNuxtImport('useSupabase', () => () => ({ auth: mocks.auth }))

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const skillFixture = (overrides: Partial<Skill> = {}): Skill => ({
  id: 'sk1',
  name: '网页摘要',
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('skillsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-skills' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('list: GET /skills，解包 { data } 信封', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [skillFixture()] }))

    await expect(skillsApi.list()).resolves.toEqual([skillFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/skills',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getById: 路径参数拼进 /skills/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: skillFixture() }))

    await expect(skillsApi.getById('sk1')).resolves.toEqual(skillFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/skills/sk1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('create: POST body 直传契约入参', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: skillFixture({ name: '新技能' }) }))
    const input = { name: '新技能' }

    await expect(skillsApi.create(input)).resolves.toEqual(skillFixture({ name: '新技能' }))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/skills',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('update: PATCH 启用状态到 /skills/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: skillFixture({ enabled: false }) }))

    await expect(skillsApi.update('sk1', { enabled: false })).resolves.toEqual(
      skillFixture({ enabled: false }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/skills/sk1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ enabled: false }) }),
    )
  })

  it('remove: DELETE 无业务数据（空信封解包为 undefined）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await expect(skillsApi.remove('sk1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/skills/sk1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('错误路径：非 2xx 信封抛 ApiError（骨架期写路径 501）', async () => {
    // Response body 只能消费一次：每次调用都返回新 Response
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '创建技能尚未实现' })),
    )

    const error = await skillsApi.create({ name: 'x' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })
})
