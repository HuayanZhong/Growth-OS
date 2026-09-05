import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FileRecord, FileUploadInput } from '@growth-os/types'
import { FilesService } from './files.service.ts'

/**
 * File 域端点（骨架）：列表/详情空态，上传与删除 501。
 * 上传实际传输为 multipart/form-data，骨架期契约不消费 body。
 */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @ApiOperation({ summary: '文件列表' })
  list(): FileRecord[] {
    return this.filesService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件元数据' })
  get(@Param('id') id: string): FileRecord {
    const file = this.filesService.getById(id)
    if (!file) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '文件不存在' })
    }
    return file
  }

  @Post()
  @ApiOperation({ summary: '上传文件（multipart/form-data）' })
  upload(@Body() input: FileUploadInput): FileRecord {
    return this.filesService.upload(input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  remove(@Param('id') id: string): void {
    this.filesService.remove(id)
  }
}
