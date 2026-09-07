/**
 * File 域 typed client（迭代计划 2.6 前端 feature 化）。
 *
 * 入参/返回类型全部派生自 packages/types 的 FilesApiMap 契约（复用 IPC 契约
 * 派生模式），本模块不重复声明业务类型；传输（token 注入、{ data } 信封解包、
 * ApiError 抛出）由 apiFetch 承担，这里只做路径拼接与契约桥接。
 */
import type { EndpointRequest, EndpointResponse, FilesApiMap } from '@growth-os/types'
import { apiFetch } from '~/composables/useApi'

/** 各端点契约的本地别名（key 与 FilesApiMap 一一对应） */
type ListFiles = FilesApiMap['GET /files']
type UploadFile = FilesApiMap['POST /files']
type GetFile = FilesApiMap['GET /files/:id']
type DeleteFile = FilesApiMap['DELETE /files/:id']

/**
 * File 域 HTTP 客户端：FilesApiMap 的完整镜像。
 * 路径参数（:id）在此拼接进 path，不进入 request 类型。
 */
export const filesApi = {
  /** GET /files → FileRecord[] */
  list: () => apiFetch<EndpointResponse<ListFiles>>('/files'),
  /** GET /files/:id → FileRecord（无数据 404 → ApiError NOT_FOUND） */
  getById: (id: string) => apiFetch<EndpointResponse<GetFile>>(`/files/${id}`),
  /**
   * POST /files → FileRecord。契约约定上传为 multipart/form-data：file 字段
   * 携带二进制，name/mimeType 为表单字段（服务端生成 id 并统计 size）。
   * FormData 由 apiFetch 原样透传，Content-Type（含 boundary）交由浏览器生成。
   */
  upload: (input: EndpointRequest<UploadFile>, file: File) => {
    const form = new FormData()
    form.set('file', file)
    form.set('name', input.name)
    form.set('mimeType', input.mimeType)
    return apiFetch<EndpointResponse<UploadFile>>('/files', { method: 'POST', body: form })
  },
  /** DELETE /files/:id → 无业务数据（信封 {}，解包为 undefined） */
  remove: (id: string) =>
    apiFetch<EndpointResponse<DeleteFile>>(`/files/${id}`, { method: 'DELETE' }),
}
