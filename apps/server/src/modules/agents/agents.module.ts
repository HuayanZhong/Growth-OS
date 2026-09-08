import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditModule } from '../audit/audit.module.ts'
import { AgentEntity } from './entities/agent.entity.ts'
import { AgentsController } from './agents.controller.ts'
import { AgentsService } from './agents.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([AgentEntity]), AuditModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
