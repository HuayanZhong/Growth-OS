import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { CreateSkillInput, Skill, UpdateSkillInput } from '@growth-os/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { SkillsService } from './skills.service.ts'

/** Skill 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'Skill 列表（按更新时间倒序）' })
  async list(): Promise<Skill[]> {
    return this.skillsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Skill' })
  async get(@Param('id') id: string): Promise<Skill> {
    return this.skillsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建 Skill' })
  async create(
    @Body() input: CreateSkillInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Skill> {
    return this.skillsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Skill' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateSkillInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Skill> {
    return this.skillsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Skill' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.skillsService.remove(id, user.id)
  }
}
