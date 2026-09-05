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
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@growth-os/types'
import { AgentsService } from './agents.service.ts'

/**
 * Agent 域端点（骨架）：GET 列表返回空态，GET :id 无数据 404，
 * 写路径 501 NOT_IMPLEMENTED（服务层抛出）。
 */
@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Agent 列表' })
  list(): Agent[] {
    return this.agentsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Agent' })
  get(@Param('id') id: string): Agent {
    const agent = this.agentsService.getById(id)
    if (!agent) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Agent 不存在' })
    }
    return agent
  }

  @Post()
  @ApiOperation({ summary: '创建 Agent' })
  create(@Body() input: CreateAgentInput): Agent {
    return this.agentsService.create(input)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Agent' })
  update(@Param('id') id: string, @Body() input: UpdateAgentInput): Agent {
    return this.agentsService.update(id, input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent' })
  remove(@Param('id') id: string): void {
    this.agentsService.remove(id)
  }
}
