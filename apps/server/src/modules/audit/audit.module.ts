import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditLogEntity } from './entities/audit-log.entity.ts'
import { AuditController } from './audit.controller.ts'
import { AuditService } from './audit.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
