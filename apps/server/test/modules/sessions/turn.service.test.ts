import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  Agent,
  LLMChatParams,
  LLMChatResponse,
  Message,
  SessionEvent,
  SessionRecord,
} from '@growth-os/types'
import { LLM_ADAPTER } from '../../../src/infra/adapters/llm/llm.token.ts'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'
import { TurnService } from '../../../src/modules/sessions/turn.service.ts'

/**
 * 回合执行编排：事件序（turn_start→user→assistant→turn_end）、
 * "模型可见即已记录"（LLM 输入 = 投影）、model 推导、错误传播。
 * SessionsService/AgentsService/LLM 均为假对象，不触真实 DB/API。
 */
describe('TurnService', () => {
  const record: SessionRecord = {
    id: 's1',
    agentId: 'a1',
    title: '会话',
    createdAt: 1,
    updatedAt: 1,
  }
  const agent: Agent = {
    id: 'a1',
    name: '助手',
    systemPrompt: 'p',
    model: 'deepseek-chat',
    toolIds: [],
    enabled: true,
    createdAt: 1,
    updatedAt: 1,
  }

  let service: TurnService
  const sessionsService = {
    getById: vi.fn<(id: string) => Promise<SessionRecord>>(),
    findRecordById: vi.fn<(id: string) => Promise<SessionRecord | null>>(),
    appendEvent: vi.fn<(event: SessionEvent) => Promise<void>>(),
    listMessages: vi.fn<(id: string) => Promise<Message[]>>(),
  }
  const agentsService = { findById: vi.fn<(id: string) => Promise<Agent | null>>() }
  const llm = { chat: vi.fn<(params: LLMChatParams) => Promise<LLMChatResponse>>() }

  beforeEach(async () => {
    vi.resetAllMocks()
    sessionsService.getById.mockResolvedValue(record)
    sessionsService.findRecordById.mockResolvedValue(record)
    agentsService.findById.mockResolvedValue(agent)
    llm.chat.mockResolvedValue({ content: '回复', usage: { promptTokens: 1, completionTokens: 2 } })
    const moduleRef = await Test.createTestingModule({
      providers: [
        TurnService,
        { provide: SessionsService, useValue: sessionsService },
        { provide: AgentsService, useValue: agentsService },
        { provide: LLM_ADAPTER, useValue: llm },
      ],
    }).compile()
    service = moduleRef.get(TurnService)
  })

  it('完整回合：事件序 turn_start→user→assistant→turn_end，投影在 user 落库后、回复前执行', async () => {
    sessionsService.listMessages.mockResolvedValue([{ role: 'user', content: '你好' }])
    const result = await service.execute('s1', { content: '你好' })

    const types = sessionsService.appendEvent.mock.calls.map(([e]) => e.type)
    expect(types).toEqual(['turn_start', 'user_message', 'assistant_message', 'turn_end'])
    // assistant 事件绑定 agentId，payload 为 LLM 回复
    const assistantEvent = sessionsService.appendEvent.mock.calls[2]?.[0]
    expect(assistantEvent?.agentId).toBe('a1')
    expect(assistantEvent?.payload).toEqual({ content: '回复' })
    // LLM 输入 = 投影 + 会话 Agent 的模型
    expect(llm.chat).toHaveBeenCalledWith({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: '你好' }],
    })
    // 投影发生在 user_message 落库之后（invocation 顺序）
    const appendCalls = sessionsService.appendEvent.mock.invocationCallOrder
    const listCall = sessionsService.listMessages.mock.invocationCallOrder[0]
    expect(listCall).toBeGreaterThan(appendCalls[1]!)
    expect(listCall).toBeLessThan(appendCalls[2]!)
    // 事件 id 与 append 落库一致
    expect(result.eventIds).toEqual(sessionsService.appendEvent.mock.calls.map(([e]) => e.id))
    expect(result.eventIds).toHaveLength(4)
    expect(result.reply).toEqual({ role: 'assistant', content: '回复' })
  })

  it('会话未绑定 Agent：model 缺省 deepseek-chat，assistant 事件不带 agentId', async () => {
    const orphan: SessionRecord = { ...record, agentId: '' }
    sessionsService.findRecordById.mockResolvedValue(orphan)
    await service.execute('s1', { content: 'hi' })

    expect(llm.chat.mock.calls[0]?.[0].model).toBe('deepseek-chat')
    const assistantEvent = sessionsService.appendEvent.mock.calls[2]?.[0]
    expect(assistantEvent?.agentId).toBeUndefined()
  })

  it('content 为空 → BadRequestException，不落任何事件', async () => {
    await expect(service.execute('s1', { content: '' })).rejects.toThrow(BadRequestException)
    expect(sessionsService.appendEvent).not.toHaveBeenCalled()
  })

  it('会话不存在 → 404 向上传播，不落事件', async () => {
    sessionsService.getById.mockRejectedValue(new NotFoundException())
    await expect(service.execute('missing', { content: 'hi' })).rejects.toThrow(NotFoundException)
    expect(sessionsService.appendEvent).not.toHaveBeenCalled()
  })

  it('LLM 失败 → 错误向上传播；已落库的 turn_start/user 保留（append-only）', async () => {
    llm.chat.mockRejectedValue(new Error('LLM request failed: 500'))
    await expect(service.execute('s1', { content: 'hi' })).rejects.toThrow(/LLM request failed/)
    expect(sessionsService.appendEvent).toHaveBeenCalledTimes(2)
  })
})
