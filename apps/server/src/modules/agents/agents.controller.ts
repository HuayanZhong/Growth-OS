import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@growth-os/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { AgentsService } from './agents.service.ts'

/** Agent 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Agent 列表（按更新时间倒序）' })
  async list(): Promise<Agent[]> {
    return this.agentsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Agent' })
  async get(@Param('id') id: string): Promise<Agent> {
    return this.agentsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建 Agent' })
  async create(
    @Body() input: CreateAgentInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Agent> {
    return this.agentsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Agent' })
  async update(
    @Param('id') id: string,
    @Body() input: UpdateAgentInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Agent> {
    return this.agentsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.agentsService.remove(id, user.id)
  }
}
