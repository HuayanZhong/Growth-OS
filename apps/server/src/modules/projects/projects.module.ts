import { Module } from '@nestjs/common'
import { ProjectsController } from './projects.controller.ts'
import { ProjectsService } from './projects.service.ts'

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
