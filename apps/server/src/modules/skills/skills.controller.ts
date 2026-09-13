import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { createSkillSchema, skillSchema, updateSkillSchema } from '@growth-os/types'
import type { CreateSkillInput, Skill, UpdateSkillInput } from '@growth-os/types'
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
import { SkillsService } from './skills.service.ts'

/** Skill 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('skills')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Skill 列表（按更新时间倒序）' })
  @ApiDataOk(arrayOf(toOpenApiSchema(skillSchema, 'output')), 'Skill 实体数组')
  async list(): Promise<Skill[]> {
    return this.skillsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Skill' })
  @ApiParam({ name: 'id', description: 'Skill id' })
  @ApiErrorResponses('404')
  @ApiDataOk(toOpenApiSchema(skillSchema, 'output'), 'Skill 实体')
  async get(@Param('id') id: string): Promise<Skill> {
    return this.skillsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建 Skill' })
  @ApiBody({ schema: toOpenApiSchema(createSkillSchema) })
  @ApiErrorResponses('400')
  @ApiDataCreated(toOpenApiSchema(skillSchema, 'output'), '新创建的 Skill')
  async create(
    @Body(new ZodValidationPipe(createSkillSchema)) input: CreateSkillInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Skill> {
    return this.skillsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Skill' })
  @ApiParam({ name: 'id', description: 'Skill id' })
  @ApiBody({ schema: toOpenApiSchema(updateSkillSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataOk(toOpenApiSchema(skillSchema, 'output'), '更新后的 Skill')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSkillSchema)) input: UpdateSkillInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Skill> {
    return this.skillsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Skill' })
  @ApiParam({ name: 'id', description: 'Skill id' })
  @ApiErrorResponses('404')
  @ApiOkResponse({ description: '删除成功（响应体为 {}）', schema: { type: 'object' } })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.skillsService.remove(id, user.id)
  }
}
