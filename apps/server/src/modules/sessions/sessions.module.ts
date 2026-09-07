import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditModule } from '../audit/audit.module.ts'
import { SessionEventEntity } from './entities/session-event.entity.ts'
import { SessionRecordEntity } from './entities/session-record.entity.ts'
import { SessionsController } from './sessions.controller.ts'
import { SessionsService } from './sessions.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([SessionEventEntity, SessionRecordEntity]), AuditModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
