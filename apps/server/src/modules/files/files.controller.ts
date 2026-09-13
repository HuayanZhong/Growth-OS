import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { fileRecordSchema } from '@growth-os/types'
import type { FileRecord, FileUploadInput } from '@growth-os/types'
import {
  ApiDataCreated,
  ApiDataOk,
  ApiErrorResponses,
  arrayOf,
  toOpenApiSchema,
} from '../../common/openapi/schema.ts'
import { FilesService } from './files.service.ts'

/**
 * File 域端点（骨架）：列表/详情空态，上传与删除 501。
 * 上传实际传输为 multipart/form-data，骨架期契约不消费 body。
 */
@ApiTags('files')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  @ApiOperation({ summary: '文件列表' })
  @ApiDataOk(arrayOf(toOpenApiSchema(fileRecordSchema, 'output')), '文件元数据数组')
  list(): FileRecord[] {
    return this.filesService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文件元数据' })
  @ApiParam({ name: 'id', description: '文件 id' })
  @ApiErrorResponses('404')
  @ApiDataOk(toOpenApiSchema(fileRecordSchema, 'output'), '文件元数据')
  get(@Param('id') id: string): FileRecord {
    const file = this.filesService.getById(id)
    if (!file) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '文件不存在' })
    }
    return file
  }

  @Post()
  @ApiOperation({ summary: '上传文件（multipart/form-data）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: '文件二进制内容' },
        name: { type: 'string', description: '文件名' },
        mimeType: { type: 'string', description: 'MIME 类型' },
      },
      required: ['file', 'name', 'mimeType'],
    },
  })
  @ApiErrorResponses('501')
  @ApiDataCreated(toOpenApiSchema(fileRecordSchema, 'output'), '上传后的文件元数据')
  // invariant: skip — multipart 原始 body，非 JSON 契约
  upload(@Body() input: FileUploadInput): FileRecord {
    return this.filesService.upload(input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件' })
  @ApiParam({ name: 'id', description: '文件 id' })
  @ApiErrorResponses('501')
  @ApiOkResponse({ description: '删除成功（响应体为 {}）', schema: { type: 'object' } })
  remove(@Param('id') id: string): void {
    this.filesService.remove(id)
  }
}
