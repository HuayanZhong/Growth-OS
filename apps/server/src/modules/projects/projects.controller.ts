import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CreateProjectInput, Project, UpdateProjectInput } from '@growth-os/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { ProjectsService } from './projects.service.ts'

/** Project 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: '项目列表（按更新时间倒序）' })
  async list(): Promise<Project[]> {
    return this.projectsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个项目' })
  async get(@Param('id') id: string): Promise<Project> {
    return this.projectsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async create(
    @Body() input: CreateProjectInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    return this.projectsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateProjectInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    return this.projectsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.projectsService.remove(id, user.id)
  }
}
