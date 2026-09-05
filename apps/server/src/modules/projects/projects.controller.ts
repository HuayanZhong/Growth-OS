import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@growth-os/types'
import { ProjectsService } from './projects.service.ts'

/**
 * Project 域端点（骨架）：语义与 agents 一致——空列表 / 404 / 写路径 501。
 */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: '项目列表' })
  list(): Project[] {
    return this.projectsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个项目' })
  get(@Param('id') id: string): Project {
    const project = this.projectsService.getById(id)
    if (!project) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '项目不存在' })
    }
    return project
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  create(@Body() input: CreateProjectInput): Project {
    return this.projectsService.create(input)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  update(@Param('id') id: string, @Body() input: UpdateProjectInput): Project {
    return this.projectsService.update(id, input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  remove(@Param('id') id: string): void {
    this.projectsService.remove(id)
  }
}
