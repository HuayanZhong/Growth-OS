import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  createSessionSchema,
  forkSessionSchema,
  sendMessageSchema,
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
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly turnService: TurnService,
  ) {}

  @Get()
  @ApiOperation({ summary: '会话列表（按更新时间倒序）' })
  async list(): Promise<SessionRecord[]> {
    return this.sessionsService.list()
  }

  @Get(':id/events')
  @ApiOperation({ summary: '会话事件序列（升序，录制-回放同构）' })
  async listEvents(@Param('id') id: string): Promise<SessionEvent[]> {
    return this.sessionsService.listEvents(id)
  }

  @Get(':id/messages')
  @ApiOperation({ summary: '投影后的模型可见消息历史' })
  async listMessages(@Param('id') id: string): Promise<Message[]> {
    return this.sessionsService.listMessages(id)
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个会话' })
  async get(@Param('id') id: string): Promise<SessionRecord> {
    return this.sessionsService.getById(id)
  }

  @Post()
  @ApiOperation({ summary: '创建会话' })
  async create(
    @Body(new ZodValidationPipe(createSessionSchema)) input: CreateSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionRecord> {
    return this.sessionsService.create(input, user.id)
  }

  @Post(':id/messages')
  @ApiOperation({ summary: '发送用户消息并执行一个回合（turn_start→user→assistant→turn_end）' })
  async send(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) input: SendMessageInput,
  ): Promise<TurnResult> {
    return this.turnService.execute(id, input)
  }

  @Post(':id/fork')
  @ApiOperation({ summary: '从 turn/step 边界事件分叉新会话（复制 seq ≤ boundary 的事件）' })
  async fork(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(forkSessionSchema)) input: ForkSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ForkSessionResult> {
    return this.sessionsService.forkSession(id, input.boundaryEventId, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新会话' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSessionSchema)) input: UpdateSessionInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionRecord> {
    return this.sessionsService.update(id, input, user.id)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除会话（级联删除事件日志）' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.sessionsService.remove(id, user.id)
  }
}
