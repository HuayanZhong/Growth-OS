/**
 * File 域 HTTP 契约（领域地图：文件与知识库管理）。
 *
 * v1 只做文件元数据与生命周期管理；知识库（KB）的切分/检索契约待阶段三
 * 与事件系统一起设计。
 */
import { z } from 'zod'
import type { HttpEndpoint } from './http.ts'

/** FileRecord 的 schema：文件元数据 */
export const fileRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  /** 字节 */
  size: z.number().int(),
  /** epoch 毫秒 */
  createdAt: z.number().int(),
})
export type FileRecord = z.infer<typeof fileRecordSchema>

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
