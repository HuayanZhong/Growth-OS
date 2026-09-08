import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AgentsModule } from '../agents/agents.module.ts'
import { AuditModule } from '../audit/audit.module.ts'
import { SessionEventEntity } from './entities/session-event.entity.ts'
import { SessionRecordEntity } from './entities/session-record.entity.ts'
import { SessionsController } from './sessions.controller.ts'
import { SessionsService } from './sessions.service.ts'
import { TurnService } from './turn.service.ts'

@Module({
  imports: [
    MikroOrmModule.forFeature([SessionEventEntity, SessionRecordEntity]),
    AuditModule,
    AgentsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService, TurnService],
})
export class SessionsModule {}
