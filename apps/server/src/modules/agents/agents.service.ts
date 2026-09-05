import { Injectable, NotImplementedException } from '@nestjs/common'
import type { Agent, CreateAgentInput, UpdateAgentInput } from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'

/**
 * Agent 域 service（骨架，迭代计划 2.6）。
 *
 * 读路径返回空数据（前端空态可渲染）；写路径抛 501 NOT_IMPLEMENTED。
 * 阶段四适配器/持久化落地后替换为真实实现（entities + repository）。
 */
@Injectable()
export class AgentsService {
  list(): Agent[] {
    return []
  }

  getById(_id: string): Agent | null {
    return null
  }

  create(_input: CreateAgentInput): Agent {
    throw notImplemented('创建 Agent')
  }

  update(_id: string, _input: UpdateAgentInput): Agent {
    throw notImplemented('更新 Agent')
  }

  remove(_id: string): void {
    throw notImplemented('删除 Agent')
  }
}
