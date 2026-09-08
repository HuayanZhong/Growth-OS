import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditModule } from '../audit/audit.module.ts'
import { SkillEntity } from './entities/skill.entity.ts'
import { SkillsController } from './skills.controller.ts'
import { SkillsService } from './skills.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([SkillEntity], 'default'), AuditModule],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
