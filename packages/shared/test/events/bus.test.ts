import { describe, it, expect, vi } from 'vitest'
import type { SessionEvent, SessionEventType, TypedSessionEvent } from '@growth-os/types'
import { createSessionEventBus, EventVocabularyError } from '../../src/events/bus.ts'

/**
 * 类型化事件总线（迭代计划 3.3 最小实现）：on/emit/取消订阅/词汇表漂移防护。
 * 类型收窄由 typecheck 保证（handler 收到 TypedSessionEvent<T>），运行时只测分发行为。
 */
describe('createSessionEventBus', () => {
  function makeEvent(type: SessionEventType, over: Partial<SessionEvent> = {}): SessionEvent {
    return {
      id: 'e1',
      type,
      timestamp: 1_700_000_000_000,
      sessionId: 's1',
      payload: {},
      ...over,
    }
  }

  it('emit 分发到该类型的全部 handler（按订阅顺序）', () => {
    const bus = createSessionEventBus()
    const received: string[] = []
    bus.on('user_message', () => received.push('first'))
    bus.on('user_message', () => received.push('second'))

    bus.emit(makeEvent('user_message', { payload: { content: 'hi' } }))
    expect(received).toEqual(['first', 'second'])
  })

  it('handler 收到按词汇表收窄的事件（同 id/sessionId 原样透传）', () => {
    const bus = createSessionEventBus()
    const seen: Array<TypedSessionEvent<'tool_result'>> = []
    bus.on('tool_result', (event) => seen.push(event))

    const event = makeEvent('tool_result', {
      id: 'e9',
      agentId: 'a1',
      payload: { callId: 'call_1', content: 'ok' },
    })
    bus.emit(event)

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({
      id: 'e9',
      type: 'tool_result',
      agentId: 'a1',
      payload: { callId: 'call_1', content: 'ok' },
    })
  })

  it('不同类型互不串扰，取消订阅后不再收到', () => {
    const bus = createSessionEventBus()
    const messages: SessionEvent[] = []
    const turns: SessionEvent[] = []
    const offTurn = bus.on('turn_start', (event) => turns.push(event))
    bus.on('user_message', (event) => messages.push(event))
    offTurn()

    bus.emit(makeEvent('turn_start'))
    bus.emit(makeEvent('user_message', { payload: { content: 'hi' } }))

    expect(turns).toHaveLength(0)
    expect(messages).toHaveLength(1)
    expect(bus.listenerCount('turn_start')).toBe(0)
    expect(bus.listenerCount('user_message')).toBe(1)
  })

  it('无订阅者时 emit 静默完成，词汇表内类型不抛错', () => {
    const bus = createSessionEventBus()
    expect(() => bus.emit(makeEvent('condensation'))).not.toThrow()
  })

  it('emit 词汇表外的事件类型抛 EventVocabularyError（漂移防护）', () => {
    const bus = createSessionEventBus()
    expect(() => bus.emit(makeEvent('not_in_vocabulary' as SessionEventType))).toThrow(
      EventVocabularyError,
    )
  })

  it('一个 handler 抛错中断本轮分发（fail fast，不吞错）', () => {
    const bus = createSessionEventBus()
    const second = vi.fn()
    bus.on('step_end', () => {
      throw new Error('handler boom')
    })
    bus.on('step_end', second)

    expect(() => bus.emit(makeEvent('step_end'))).toThrow('handler boom')
    expect(second).not.toHaveBeenCalled()
  })
})
