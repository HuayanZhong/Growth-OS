import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { createProjectSchema, projectSchema, updateProjectSchema } from '@growth-os/types'
import type { CreateProjectInput, Project, UpdateProjectInput } from '@growth-os/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import {
  ApiDataCreated,
  ApiDataOk,
  ApiErrorResponses,
  arrayOf,
  toOpenApiSchema,
} from '../../common/openapi/schema.ts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { ProjectsService } from './projects.service.ts'

/** Project 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('projects')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: '项目列表（按更新时间倒序）' })
  @ApiDataOk(arrayOf(toOpenApiSchema(projectSchema, 'output')), '项目实体数组')
  async list(): Promise<Project[]> {
    return this.projectsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个项目' })
  @ApiParam({ name: 'id', description: '项目 id' })
  @ApiErrorResponses('404')
  @ApiDataOk(toOpenApiSchema(projectSchema, 'output'), '项目实体')
  async get(@Param('id') id: string): Promise<Project> {
    return this.projectsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  @ApiBody({ schema: toOpenApiSchema(createProjectSchema) })
  @ApiErrorResponses('400')
  @ApiDataCreated(toOpenApiSchema(projectSchema, 'output'), '新创建的项目')
  async create(
    @Body(new ZodValidationPipe(createProjectSchema)) input: CreateProjectInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    return this.projectsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  @ApiParam({ name: 'id', description: '项目 id' })
  @ApiBody({ schema: toOpenApiSchema(updateProjectSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataOk(toOpenApiSchema(projectSchema, 'output'), '更新后的项目')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) input: UpdateProjectInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    return this.projectsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  @ApiParam({ name: 'id', description: '项目 id' })
  @ApiErrorResponses('404')
  @ApiOkResponse({ description: '删除成功（响应体为 {}）', schema: { type: 'object' } })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.projectsService.remove(id, user.id)
  }
}
