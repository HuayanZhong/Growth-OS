/**
 * Storage 能力适配器契约（迭代计划 2.1）。
 *
 * 抽象二进制对象存储：实现方可以是本地磁盘、Supabase Storage 或
 * S3 兼容服务，调用方（File 域 service）只依赖本接口。
 *
 * content 使用 Uint8Array 而非 Buffer——类型包同时被渲染进程（DOM 上下文）
 * 与 Node 侧消费，Uint8Array 是两侧的标准类型。
 */

/** 上传入参：key 含目录前缀（如 `files/2025/xx.ext`），实现方按 key 寻址 */
export interface StorageUploadInput {
  key: string
  content: Uint8Array
  mimeType?: string
}

/** 存储对象元数据 */
export interface StoredFile {
  key: string
  /** 字节 */
  size: number
  mimeType?: string
}

/** 下载结果 */
export interface StorageDownload {
  content: Uint8Array
  mimeType?: string
  size: number
}

export interface StorageAdapter {
  /** 写入对象（同 key 覆盖） */
  upload(input: StorageUploadInput): Promise<StoredFile>
  /** 读取对象；key 不存在返回 null */
  download(key: string): Promise<StorageDownload | null>
  /** 删除对象；key 不存在不报错 */
  delete(key: string): Promise<void>
  /** 列出前缀下的对象（可选：实现方无目录语义时可缺省） */
  list?(prefix: string): Promise<StoredFile[]>
}
