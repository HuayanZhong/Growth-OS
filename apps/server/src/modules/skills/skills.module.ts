import { Module } from '@nestjs/common'
import { SkillsController } from './skills.controller.ts'
import { SkillsService } from './skills.service.ts'

@Module({
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
