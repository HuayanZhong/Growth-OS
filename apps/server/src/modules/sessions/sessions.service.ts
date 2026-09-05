import { Injectable, NotImplementedException } from '@nestjs/common'
import { deriveMessages } from '@growth-os/shared'
import type {
  Message,
  SessionEvent,
  SessionRecord,
  CreateSessionInput,
  UpdateSessionInput,
} from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'

/**
 * Session 域 service（骨架，迭代计划 2.6）。
 *
 * 会话事件日志是唯一事实源；阶段三在此接入事件存储（append-only），
 * 骨架期 listEvents 返回空序列，listMessages 演示投影接缝——
 * 对事件序列跑 deriveMessages，事件为空则历史为空。
 */
@Injectable()
export class SessionsService {
  list(): SessionRecord[] {
    return []
  }

  getById(_id: string): SessionRecord | null {
    return null
  }

  create(_input: CreateSessionInput): SessionRecord {
    throw notImplemented('创建会话')
  }

  update(_id: string, _input: UpdateSessionInput): SessionRecord {
    throw notImplemented('更新会话')
  }

  remove(_id: string): void {
    throw notImplemented('删除会话')
  }

  /** 会话事件序列（升序）。阶段三接入事件存储后返回真实录制/追加序列 */
  listEvents(_id: string): SessionEvent[] {
    return []
  }

  /** 消息投影 = 事件序列跑 deriveMessages（模型可见即已记录） */
  listMessages(id: string): Message[] {
    return deriveMessages(this.listEvents(id))
  }
}
