/**
 * File 域 HTTP 契约（领域地图：文件与知识库管理）。
 *
 * v1 只做文件元数据与生命周期管理；知识库（KB）的切分/检索契约待阶段三
 * 与事件系统一起设计。
 */
import type { HttpEndpoint } from './http.ts'

export interface FileRecord {
  id: string
  name: string
  mimeType: string
  /** 字节 */
  size: number
  /** epoch 毫秒 */
  createdAt: number
}

/**
 * 上传入参（实际传输为 multipart/form-data：file 字段携带二进制，
 * name/mimeType 为表单字段；服务端生成 id 并统计 size）。
 */
export interface FileUploadInput {
  name: string
  mimeType: string
}

export interface FilesApiMap {
  'GET /files': HttpEndpoint<'GET', undefined, FileRecord[]>
  'POST /files': HttpEndpoint<'POST', FileUploadInput, FileRecord>
  'GET /files/:id': HttpEndpoint<'GET', undefined, FileRecord>
  'DELETE /files/:id': HttpEndpoint<'DELETE', undefined, undefined>
}
