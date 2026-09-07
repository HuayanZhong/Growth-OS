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
import type {
  Message,
  SessionEvent,
  SessionRecord,
  CreateSessionInput,
  ForkSessionInput,
  ForkSessionResult,
  UpdateSessionInput,
} from '@growth-os/types'
import { SessionsService } from './sessions.service.ts'

/**
 * Session 域端点：CRUD 同其余域（空列表 / 404 / 写路径 501）；
 * events 返回持久化的事件序列（升序），messages 返回投影后的模型可见历史。
 */
@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: '会话列表' })
  list(): SessionRecord[] {
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
  get(@Param('id') id: string): SessionRecord {
    const session = this.sessionsService.getById(id)
    if (!session) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '会话不存在' })
    }
    return session
  }

  @Post()
  @ApiOperation({ summary: '创建会话' })
  create(@Body() input: CreateSessionInput): SessionRecord {
    return this.sessionsService.create(input)
  }

  @Post(':id/fork')
  @ApiOperation({ summary: '从 turn/step 边界事件分叉新会话（复制 seq ≤ boundary 的事件）' })
  fork(@Param('id') id: string, @Body() input: ForkSessionInput): Promise<ForkSessionResult> {
    return this.sessionsService.forkSession(id, input.boundaryEventId)
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新会话' })
  update(@Param('id') id: string, @Body() input: UpdateSessionInput): SessionRecord {
    return this.sessionsService.update(id, input)
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除会话' })
  remove(@Param('id') id: string): void {
    this.sessionsService.remove(id)
  }
}
