import { Controller, Get, Query } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuditLog, AuditLogQuery } from '@growth-os/types'
import { AuditService } from './audit.service.ts'

/** Audit 域端点：审计日志只读查询（记录由服务端各域写操作触发） */
@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: '审计日志列表（按时间倒序，支持过滤）' })
  async list(@Query() query: AuditLogQuery): Promise<AuditLog[]> {
    return this.auditService.query(query)
  }
}
