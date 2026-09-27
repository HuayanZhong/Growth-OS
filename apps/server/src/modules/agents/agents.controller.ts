import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { agentSchema, createAgentSchema, deleteAgentResultSchema } from '@growth-os/types'
import type { Agent, CreateAgentInput } from '@growth-os/types'
import type { AuthenticatedUser } from '../../shared/types/auth.types.ts'
import { CurrentUser } from '../../common/decorators/current-user.decorator.ts'
import {
  ApiDataOk,
  ApiErrorResponses,
  arrayOf,
  toOpenApiSchema,
} from '../../common/openapi/schema.ts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.ts'
import { AgentsService } from './agents.service.ts'

/** Agent 目录端点：目录以服务端为唯一数据源（默认 Agent seed 行只读可见） */
@ApiTags('agents')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: '创建自定义 Agent（slug 服务端生成）' })
  @ApiErrorResponses('400')
  @ApiDataOk(toOpenApiSchema(agentSchema, 'output'), '新 Agent 数据')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createAgentSchema)) input: CreateAgentInput,
  ): Promise<Agent> {
    return this.agentsService.create(user.id, input)
  }

  @Get()
  @ApiOperation({ summary: '目录列表：默认 Agent 在前 + 本人自建按创建时间升序' })
  @ApiDataOk(arrayOf(toOpenApiSchema(agentSchema, 'output')), 'Agent 目录')
  async list(@CurrentUser() user: AuthenticatedUser): Promise<Agent[]> {
    return this.agentsService.list(user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除自定义 Agent（按主键 id，默认 Agent 拒绝）' })
  @ApiParam({ name: 'id', required: true, type: String, description: 'Agent 主键 id' })
  @ApiErrorResponses('403', '404')
  @ApiDataOk(toOpenApiSchema(deleteAgentResultSchema, 'output'), '删除确认')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ deleted: true }> {
    await this.agentsService.remove(user.id, id)
    return { deleted: true }
  }
}
