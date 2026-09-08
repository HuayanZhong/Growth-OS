import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AuditModule } from '../audit/audit.module.ts'
import { ProjectEntity } from './entities/project.entity.ts'
import { ProjectsController } from './projects.controller.ts'
import { ProjectsService } from './projects.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([ProjectEntity], 'default'), AuditModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
