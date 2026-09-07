import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@growth-os/types'
import {
  toSessionEvent,
  toSessionEventRow,
} from '../../../../src/modules/sessions/entities/session-event.entity.ts'
import type { SessionEventRow } from '../../../../src/modules/sessions/entities/session-event.entity.ts'

/**
 * 事件契约 ↔ 存储行映射：epoch ms ↔ Date、agentId 缺省归一。
 * schema 元数据（列类型/索引）由迁移 + mikro-orm:debug 验证，不在单测重复。
 */
describe('SessionEventEntity 映射', () => {
  const T0 = 1_700_000_000_000

  it('契约事件 → 行：epoch ms 转 Date，缺省 agentId 归一为 null', () => {
    const event: SessionEvent = {
      id: 'e1',
      type: 'user_message',
      timestamp: T0,
      sessionId: 's1',
      payload: { content: 'hi' },
    }
    expect(toSessionEventRow(event)).toEqual({
      id: 'e1',
      sessionId: 's1',
      agentId: null,
      type: 'user_message',
      timestamp: new Date(T0),
      payload: { content: 'hi' },
    })
  })

  it('行 → 契约事件：Date 转回 epoch ms，null agentId 不落回契约字段', () => {
    const row = {
      seq: 1,
      id: 'e1',
      sessionId: 's1',
      agentId: null,
      type: 'user_message',
      timestamp: new Date(T0),
      payload: { content: 'hi' },
    }
    expect(toSessionEvent(row)).toEqual({
      id: 'e1',
      type: 'user_message',
      timestamp: T0,
      sessionId: 's1',
      payload: { content: 'hi' },
    })
  })

  it('roundtrip 保留 agentId、类型与时间戳精度', () => {
    const event: SessionEvent = {
      id: 'e2',
      type: 'assistant_message',
      timestamp: T0 + 5,
      sessionId: 's1',
      agentId: 'a1',
      payload: { content: 'yo' },
    }
    const row: SessionEventRow = { seq: 1, ...toSessionEventRow(event) }
    expect(toSessionEvent(row)).toEqual(event)
  })
})
