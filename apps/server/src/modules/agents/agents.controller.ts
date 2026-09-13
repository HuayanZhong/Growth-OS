import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { agentSchema, createAgentSchema, updateAgentSchema } from '@growth-os/types'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@growth-os/types'
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
import { AgentsService } from './agents.service.ts'

/** Agent 域端点：CRUD 接持久化存储（不存在 → 404 由 service 抛出），写操作记审计 */
@ApiTags('agents')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Agent 列表（按更新时间倒序）' })
  @ApiDataOk(arrayOf(toOpenApiSchema(agentSchema, 'output')), 'Agent 实体数组')
  async list(): Promise<Agent[]> {
    return this.agentsService.list()
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个 Agent' })
  @ApiParam({ name: 'id', description: 'Agent id' })
  @ApiErrorResponses('404')
  @ApiDataOk(toOpenApiSchema(agentSchema, 'output'), 'Agent 实体')
  async get(@Param('id') id: string): Promise<Agent> {
    return this.agentsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建 Agent' })
  @ApiBody({ schema: toOpenApiSchema(createAgentSchema) })
  @ApiErrorResponses('400')
  @ApiDataCreated(toOpenApiSchema(agentSchema, 'output'), '新创建的 Agent')
  async create(
    @Body(new ZodValidationPipe(createAgentSchema)) input: CreateAgentInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Agent> {
    return this.agentsService.create(input, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 Agent' })
  @ApiParam({ name: 'id', description: 'Agent id' })
  @ApiBody({ schema: toOpenApiSchema(updateAgentSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataOk(toOpenApiSchema(agentSchema, 'output'), '更新后的 Agent')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) input: UpdateAgentInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Agent> {
    return this.agentsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 Agent' })
  @ApiParam({ name: 'id', description: 'Agent id' })
  @ApiErrorResponses('404')
  @ApiOkResponse({ description: '删除成功（响应体为 {}）', schema: { type: 'object' } })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.agentsService.remove(id, user.id)
  }
}
