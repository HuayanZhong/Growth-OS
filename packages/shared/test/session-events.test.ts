import { describe, it, expect } from 'vitest'
import type { SessionEvent } from '@growth-os/types'
import { deriveMessages, ProjectionError } from '../src/session-events.ts'
import { recordedSessionFixture } from './session-events.fixture.ts'

/**
 * 回放测试：fixture 即录制格式（事件升序），断言消息投影。
 * CI 无 API key 也可跑——不触任何外部服务（迭代计划 1.2 会话录制-回放的投影部分）。
 */
describe('deriveMessages（fixture 回放）', () => {
  it('按录制序列投影出模型可见消息，簿记事件被跳过', () => {
    const messages = deriveMessages(recordedSessionFixture)

    expect(messages).toEqual([
      { role: 'system', content: '你是 Growth OS 助手，回答保持简洁。' },
      { role: 'system', content: '当前时间：2025-01-01 08:00 (Asia/Shanghai)' },
      { role: 'user', content: '帮我查一下今天的日期' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call_001', name: 'get_current_time', arguments: '{"timezone":"Asia/Shanghai"}' },
        ],
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call_002', name: 'search_web', arguments: '{"query":"今天日期"}' }],
      },
      { role: 'tool', content: '2025-01-01', toolCallId: 'call_002' },
      { role: 'assistant', content: '今天是 2025-01-01。' },
    ])
  })

  it('投影数量 = 可投影事件数（12 个事件中 7 个可投影）', () => {
    const bookkeeping = new Set([
      'turn_start',
      'turn_end',
      'step_start',
      'step_end',
      'condensation',
      'agent_created',
      'agent_status_changed',
    ])
    const projectable = recordedSessionFixture.filter((e) => !bookkeeping.has(e.type))

    expect(deriveMessages(recordedSessionFixture)).toHaveLength(projectable.length)
  })

  it('空序列投影为空历史', () => {
    expect(deriveMessages([])).toEqual([])
  })
})

describe('deriveMessages（不变量防护）', () => {
  const base = { timestamp: 0, sessionId: 's1' } as const

  it('内容型事件缺失 content 抛 ProjectionError（模型可见即已记录）', () => {
    const event = { ...base, id: 'e1', type: 'user_message', payload: {} } as SessionEvent

    expect(() => deriveMessages([event])).toThrow(ProjectionError)
    expect(() => deriveMessages([event])).toThrow('缺失 content')
  })

  it('payload 非对象抛 ProjectionError', () => {
    const event = {
      ...base,
      id: 'e2',
      type: 'assistant_message',
      payload: 'raw string',
    } as unknown as SessionEvent

    expect(() => deriveMessages([event])).toThrow(ProjectionError)
  })

  it('tool_result 缺失 callId 抛 ProjectionError', () => {
    const event = {
      ...base,
      id: 'e3',
      type: 'tool_result',
      payload: { content: 'ok' },
    } as SessionEvent

    expect(() => deriveMessages([event])).toThrow(ProjectionError)
  })

  it('词汇表外的事件类型抛 ProjectionError（漂移必须暴露）', () => {
    const event = {
      ...base,
      id: 'e4',
      type: 'some_new_event',
      payload: {},
    } as unknown as SessionEvent

    expect(() => deriveMessages([event])).toThrow('不在会话事件词汇表内')
  })
})
