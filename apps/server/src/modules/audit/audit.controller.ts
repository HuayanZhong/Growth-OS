import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { auditLogQuerySchema, auditLogSchema } from '@growth-os/types'
import type { AuditLog, AuditLogQuery } from '@growth-os/types'
import {
  ApiDataOk,
  ApiErrorResponses,
  arrayOf,
  toOpenApiSchema,
} from '../../common/openapi/schema.ts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.ts'
import { AuditService } from './audit.service.ts'

/** Audit 域端点：审计日志只读查询（记录由服务端各域写操作触发） */
@ApiTags('audit')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: '审计日志列表（按时间倒序，支持过滤）' })
  @ApiQuery({
    name: 'actorId',
    required: false,
    type: String,
    description: '按操作者（JWT sub）过滤',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    description: '按动作过滤（create/update/delete/fork）',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    type: String,
    description: '按资源类型过滤（session/agent/file/...）',
  })
  @ApiQuery({ name: 'resourceId', required: false, type: String, description: '按资源 id 过滤' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: Number,
    description: '起始时间（epoch ms，闭区间）',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: Number,
    description: '结束时间（epoch ms，闭区间）',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '条数上限（1-100）' })
  @ApiErrorResponses('400')
  @ApiDataOk(arrayOf(toOpenApiSchema(auditLogSchema, 'output')), '审计日志数组')
  async list(
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery,
  ): Promise<AuditLog[]> {
    return this.auditService.query(query)
  }
}
