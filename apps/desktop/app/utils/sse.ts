// SSE 事件帧解析（零运行时依赖纯函数）：字节流解码后的文本 → ChatStreamEvent。
// 帧契约见 @growth-os/types chat-stream（data: <单事件 JSON>\n\n）；
// 未知/非法事件丢弃并回调打点，不中断流——契约加法演进的兼容机制。
import { chatStreamEventSchema } from '@growth-os/types'
import type { ChatStreamEvent } from '@growth-os/types'

export interface SseEventParserOptions {
  /** 非法或未知帧回调（打点/console.warn 由调用方决定），不中断流 */
  onInvalid?: (reason: string, raw: string) => void
}

export interface SseEventParser {
  /** 喂入一段解码文本（可为任意切块边界），返回解析出的事件 */
  push: (chunk: string) => ChatStreamEvent[]
  /** 流结束：处理残余缓冲（对端异常收尾时的半帧按非法处理） */
  flush: () => ChatStreamEvent[]
}

export function createSseEventParser(options: SseEventParserOptions = {}): SseEventParser {
  let buffer = ''

  function processBlock(block: string): ChatStreamEvent[] {
    // SSE data 行（本契约单帧单 data 行；多行按规范以 \n 连接）
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trimStart())
      .join('\n')
    if (!data) return []

    let parsed: unknown
    try {
      parsed = JSON.parse(data)
    } catch {
      options.onInvalid?.('bad-json', block)
      return []
    }
    const result = chatStreamEventSchema.safeParse(parsed)
    if (!result.success) {
      const type =
        typeof parsed === 'object' && parsed !== null && 'type' in parsed
          ? String((parsed as { type: unknown }).type)
          : 'unknown'
      options.onInvalid?.(`unknown-or-invalid-event:${type}`, block)
      return []
    }
    return [result.data]
  }

  return {
    push(chunk: string): ChatStreamEvent[] {
      // \r\n 归一（SSE 规范允许，服务端只发 \n；防御代理层改写）
      buffer = (buffer + chunk).replace(/\r\n/g, '\n')
      const events: ChatStreamEvent[] = []
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        events.push(...processBlock(buffer.slice(0, boundary)))
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')
      }
      return events
    },
    flush(): ChatStreamEvent[] {
      const rest = buffer
      buffer = ''
      if (rest.trim() === '') return []
      const events = processBlock(rest)
      if (events.length === 0) options.onInvalid?.('incomplete-frame', rest)
      return events
    },
  }
}
