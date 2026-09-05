import { Injectable, NotImplementedException } from '@nestjs/common'
import type { FileRecord, FileUploadInput } from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'

/**
 * File 域 service（骨架，迭代计划 2.6）。
 * 阶段四接入 StorageAdapter 实现（本地磁盘 / Supabase Storage）后落地。
 */
@Injectable()
export class FilesService {
  list(): FileRecord[] {
    return []
  }

  getById(_id: string): FileRecord | null {
    return null
  }

  upload(_input: FileUploadInput): FileRecord {
    throw notImplemented('上传文件')
  }

  remove(_id: string): void {
    throw notImplemented('删除文件')
  }
}
