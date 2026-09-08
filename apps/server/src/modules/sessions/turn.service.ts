import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { LLMAdapter, SendMessageInput, SessionEvent, TurnResult } from '@growth-os/types'
import { LLM_ADAPTER } from '../../infra/adapters/llm/llm.token.ts'
import { AgentsService } from '../agents/agents.service.ts'
import { SessionsService } from './sessions.service.ts'

/** turn 事件的缺省模型：会话未绑定 Agent（或 Agent 缺失）时兜底 */
const DEFAULT_MODEL = 'deepseek-chat'

/**
 * 回合执行（turn 管线）：一条用户消息触发一个回合——
 * 事件序 turn_start → user_message → assistant_message → turn_end 逐条落库
 * （append-only；LLM 调用在 DB 写入之间进行，失败时已落库事件保留，
 *  用户重发即开启新回合）。
 *
 * "模型可见即已记录"：LLM 的输入是对 user_message 之前的事件序列跑
 * deriveMessages 的投影——进模型的内容必然来自事件日志。
 */
@Injectable()
export class TurnService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly agentsService: AgentsService,
    @Inject(LLM_ADAPTER) private readonly llm: LLMAdapter,
  ) {}

  async execute(sessionId: string, input: SendMessageInput): Promise<TurnResult> {
    if (typeof input.content !== 'string' || input.content.length === 0) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '消息内容不能为空' })
    }

    // 会话必须存在（记录 + 事件日志均归会话）
    await this.sessionsService.getById(sessionId)
    const record = await this.sessionsService.findRecordById(sessionId)
    const agent = record?.agentId ? await this.agentsService.findById(record.agentId) : null
    const model = agent?.model ?? DEFAULT_MODEL

    const append = async (event: Omit<SessionEvent, 'id' | 'sessionId'>): Promise<string> => {
      const id = randomUUID()
      await this.sessionsService.appendEvent({ ...event, id, sessionId })
      return id
    }

    const eventIds: string[] = [
      await append({ type: 'turn_start', timestamp: Date.now(), payload: {} }),
    ]
    eventIds.push(
      await append({
        type: 'user_message',
        timestamp: Date.now(),
        payload: { content: input.content },
      }),
    )

    // 模型可见历史：对已落库事件跑投影（含本条 user_message）
    const projection = await this.sessionsService.listMessages(sessionId)
    const completion = await this.llm.chat({ model, messages: projection })

    eventIds.push(
      await append({
        type: 'assistant_message',
        timestamp: Date.now(),
        ...(record?.agentId ? { agentId: record.agentId } : {}),
        payload: { content: completion.content },
      }),
    )
    eventIds.push(await append({ type: 'turn_end', timestamp: Date.now(), payload: {} }))

    return { eventIds, reply: { role: 'assistant', content: completion.content } }
  }
}
