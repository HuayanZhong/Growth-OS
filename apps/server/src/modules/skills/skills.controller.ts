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
import type { Skill, CreateSkillInput, UpdateSkillInput } from '@growth-os/types'
import { SkillsService } from './skills.service.ts'

/**
 * Skill 域端点（骨架）：语义与 agents 一致——空列表 / 404 / 写路径 501。
 */
@ApiTags('skills')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: '技能列表' })
  list(): Skill[] {
    return this.skillsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个技能' })
  get(@Param('id') id: string): Skill {
    const skill = this.skillsService.getById(id)
    if (!skill) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '技能不存在' })
    }
    return skill
  }

  @Post()
  @ApiOperation({ summary: '注册技能' })
  create(@Body() input: CreateSkillInput): Skill {
    return this.skillsService.create(input)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新技能（含启用状态）' })
  update(@Param('id') id: string, @Body() input: UpdateSkillInput): Skill {
    return this.skillsService.update(id, input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除技能' })
  remove(@Param('id') id: string): void {
    this.skillsService.remove(id)
  }
}
