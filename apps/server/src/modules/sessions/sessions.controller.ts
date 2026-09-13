import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import {
  createSessionSchema,
  forkSessionResultSchema,
  forkSessionSchema,
  messageSchema,
  sendMessageSchema,
  sessionEventSchema,
  sessionRecordSchema,
  turnResultSchema,
  updateSessionSchema,
} from '@growth-os/types'
import type {
  Message,
  SessionEvent,
  SessionRecord,
  CreateSessionInput,
  ForkSessionInput,
  ForkSessionResult,
  SendMessageInput,
  TurnResult,
  UpdateSessionInput,
} from '@growth-os/types'
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
import { SessionsService } from './sessions.service.ts'
import { TurnService } from './turn.service.ts'

/**
 * Session 域端点：会话记录 CRUD 与事件日志/投影全部接入持久化存储
 * （不存在 → 404 由 service 抛出）；fork 从 turn/step 边界事件分叉新会话。
 * 写操作以 JWT 身份（actorId = sub）记入审计日志。
 */
@ApiTags('sessions')
@ApiBearerAuth()
@ApiErrorResponses('401', '500')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly turnService: TurnService,
  ) {}

  @Get()
  @ApiOperation({ summary: '会话列表（按更新时间倒序）' })
  @ApiDataOk(arrayOf(toOpenApiSchema(sessionRecordSchema, 'output')), '会话记录数组')
  async list(): Promise<SessionRecord[]> {
    return this.sessionsService.list()
  }

  @Get(':id/events')
  @ApiOperation({ summary: '会话事件序列（升序，录制-回放同构）' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiErrorResponses('404')
  @ApiDataOk(arrayOf(toOpenApiSchema(sessionEventSchema, 'output')), '事件数组')
  async listEvents(@Param('id') id: string): Promise<SessionEvent[]> {
    return this.sessionsService.listEvents(id)
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '投影后的模型可见消息历史' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiErrorResponses('404')
  @ApiDataOk(arrayOf(toOpenApiSchema(messageSchema, 'output')), 'Message 数组')
  async listMessages(@Param('id') id: string): Promise<Message[]> {
    return this.sessionsService.listMessages(id)
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个会话' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiErrorResponses('404')
  @ApiDataOk(toOpenApiSchema(sessionRecordSchema, 'output'), '会话记录')
  async get(@Param('id') id: string): Promise<SessionRecord> {
    return this.sessionsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建会话' })
  @ApiBody({ schema: toOpenApiSchema(createSessionSchema) })
  @ApiErrorResponses('400')
  @ApiDataCreated(toOpenApiSchema(sessionRecordSchema, 'output'), '新创建的会话')
  async create(
    @Body(new ZodValidationPipe(createSessionSchema)) input: CreateSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionRecord> {
    return this.sessionsService.create(input, user.id)
  }

  @Post(':id/messages')
  @ApiOperation({ summary: '发送用户消息并执行一个回合（turn_start→user→assistant→turn_end）' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiBody({ schema: toOpenApiSchema(sendMessageSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataCreated(
    toOpenApiSchema(turnResultSchema, 'output'),
    '回合结果：事件 id 序 + assistant 回复',
  )
  async send(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) input: SendMessageInput,
  ): Promise<TurnResult> {
    return this.turnService.execute(id, input)
  }

  @Post(':id/fork')
  @ApiOperation({ summary: '从 turn/step 边界事件分叉新会话（复制 seq ≤ boundary 的事件）' })
  @ApiParam({ name: 'id', description: '源会话 id' })
  @ApiBody({ schema: toOpenApiSchema(forkSessionSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataCreated(toOpenApiSchema(forkSessionResultSchema, 'output'), '新会话 id 与复制的事件数')
  async fork(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(forkSessionSchema)) input: ForkSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ForkSessionResult> {
    return this.sessionsService.forkSession(id, input.boundaryEventId, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新会话' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiBody({ schema: toOpenApiSchema(updateSessionSchema) })
  @ApiErrorResponses('400', '404')
  @ApiDataOk(toOpenApiSchema(sessionRecordSchema, 'output'), '更新后的会话')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) input: UpdateSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionRecord> {
    return this.sessionsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除会话（级联删除事件日志）' })
  @ApiParam({ name: 'id', description: '会话 id' })
  @ApiErrorResponses('404')
  @ApiOkResponse({ description: '删除成功（响应体为 {}）', schema: { type: 'object' } })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.sessionsService.remove(id, user.id)
  }
}
