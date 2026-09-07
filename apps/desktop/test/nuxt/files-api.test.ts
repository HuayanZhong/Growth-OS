import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { FileRecord } from '@growth-os/types'
import { filesApi } from '~/features/files/api'
import { ApiError } from '~/composables/useApi'

/**
 * File 域 typed client 测试：走真实 apiFetch 链路（mockNuxtImport useSupabase
 * + stub 全局 fetch，同 agents-api.test.ts），断言各端点的路径拼接、方法、body
 * 与信封解包是否符合 FilesApiMap 契约（upload 为 multipart/form-data 特例）。
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

const fileFixture = (overrides: Partial<FileRecord> = {}): FileRecord => ({
  id: 'f1',
  name: '报告.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  createdAt: 0,
  ...overrides,
})

describe('filesApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok-files' } },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mocks.auth.getSession.mockReset()
  })

  it('list: GET /files，解包 { data } 信封', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [fileFixture()] }))

    await expect(filesApi.list()).resolves.toEqual([fileFixture()])
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/files',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('getById: 路径参数拼进 /files/:id', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: fileFixture() }))

    await expect(filesApi.getById('f1')).resolves.toEqual(fileFixture())
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/files/f1',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('upload: POST multipart/form-data（file 二进制 + name/mimeType 表单字段，无 JSON Content-Type）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: fileFixture() }))
    const file = new File(['pdf-bytes'], '报告.pdf', { type: 'application/pdf' })

    await expect(
      filesApi.upload({ name: '报告.pdf', mimeType: 'application/pdf' }, file),
    ).resolves.toEqual(fileFixture())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')

    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-files')
    // multipart 的 Content-Type（含 boundary）交由浏览器生成，apiFetch 不手工设置
    expect(headers['Content-Type']).toBeUndefined()

    const form = init.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('name')).toBe('报告.pdf')
    expect(form.get('mimeType')).toBe('application/pdf')
    const uploaded = form.get('file')
    expect(uploaded).toBeInstanceOf(File)
    expect((uploaded as File).name).toBe('报告.pdf')
  })

  it('remove: DELETE 无业务数据（空信封解包为 undefined）', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))

    await expect(filesApi.remove('f1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/files/f1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('错误路径：非 2xx 信封抛 ApiError（骨架期写路径 501）', async () => {
    // Response body 只能消费一次：每次调用都返回新 Response
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(501, { code: 'NOT_IMPLEMENTED', message: '上传文件尚未实现' })),
    )

    const error = await filesApi
      .upload({ name: 'x.txt', mimeType: 'text/plain' }, new File(['x'], 'x.txt'))
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' })
  })
})
