import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditModule } from '../audit/audit.module.ts'
import { AgentEntity } from './entities/agent.entity.ts'
import { AgentsController } from './agents.controller.ts'
import { AgentsService } from './agents.service.ts'

@Module({
  // contextName 必须与 mikro-orm.config 一致：forRoot 声明 contextName 后 EM 以
  // '<name>_EntityManager' token 导出，forFeature 不带同名 contextName 时 repository
  // provider 注入 EntityManager 类 token，启动即崩
  imports: [MikroOrmModule.forFeature([AgentEntity], 'default'), AuditModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
