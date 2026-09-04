import type { Message, SessionEvent } from '@growth-os/types'
import { deriveMessages } from '@growth-os/shared'
import { apiFetch } from './useApi'

/**
 * 会话录制回放（迭代计划 1.2 P0）。
 *
 * 通过自有后端 API 拉取会话事件序列（录制产物），投影为模型可见消息历史。
 * 阶段一：事件源是录制 fixture（测试经 apiFetch mock 注入）；
 * 阶段三：sessions 域事件查询落地后，同一消费路径切换为真实事件存储。
 *
 * "模型可见即已记录"不变量由 deriveMessages 保障：投影只认事件日志，
 * 词汇表外事件或内容缺失直接抛 ProjectionError，不静默丢弃。
 */
export function useSessionReplay(sessionId: string) {
  const events = ref<SessionEvent[]>([])

  // 投影是纯函数：事件序列变化即重算
  const messages = computed<Message[]>(() => deriveMessages(events.value))

  /** 拉取录制的事件序列（升序）并触发重投影 */
  async function load(): Promise<void> {
    events.value = await apiFetch<SessionEvent[]>(`/sessions/${sessionId}/events`)
  }

  return { events, messages, load }
}
