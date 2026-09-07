import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Project } from '@growth-os/types'
import { projectsApi } from '~/features/projects/api'
import { ApiError } from '~/composables/useApi'

/**
 * Project 域 typed client 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch，同 agents-api.test.ts），断言各端点的路径拼接、方法、body
 * 与信封解包是否符合 ProjectsApiMap 契约。
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

const projectFixture = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: '增长实验',
  agentIds: [],
  sessionIds: [],
  skillIds: [],
  fileIds: [],
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

describe('projectsApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-projects' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('list: GET /projects，解包 { data } 信封', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [projectFixture()] }))

    await expect(projectsApi.list()).resolves.toEqual([projectFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/projects',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getById: 路径参数拼进 /projects/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: projectFixture() }))

    await expect(projectsApi.getById('p1')).resolves.toEqual(projectFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/projects/p1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('create: POST body 直传契约入参', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: projectFixture() }))
    const input = { name: '增长实验' }

    await expect(projectsApi.create(input)).resolves.toEqual(projectFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/projects',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })

  it('update: PATCH 部分字段到 /projects/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: projectFixture({ name: '改名' }) }))

    await expect(projectsApi.update('p1', { name: '改名' })).resolves.toEqual(
      projectFixture({ name: '改名' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/projects/p1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: '改名' }) }),
    )
  })

  it('remove: DELETE 无业务数据（空信封解包为 undefined）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await expect(projectsApi.remove('p1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/projects/p1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('错误路径：非 2xx 信封抛 ApiError（骨架期写路径 501）', async () => {
    // Response body 只能消费一次：每次调用都返回新 Response
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '创建项目尚未实现' })),
    )

    const error = await projectsApi.create({ name: 'x' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })
})
