import { Injectable, NotImplementedException } from '@nestjs/common'
import type { Skill, CreateSkillInput, UpdateSkillInput } from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'

/**
 * Skill 域 service（骨架，迭代计划 2.6）。
 * Agent.toolIds 引用本域 id；阶段四接入持久化后补目录/启用状态逻辑。
 */
@Injectable()
export class SkillsService {
  list(): Skill[] {
    return []
  }

  getById(_id: string): Skill | null {
    return null
  }

  create(_input: CreateSkillInput): Skill {
    throw notImplemented('创建 Skill')
  }

  update(_id: string, _input: UpdateSkillInput): Skill {
    throw notImplemented('更新 Skill')
  }

  remove(_id: string): void {
    throw notImplemented('删除 Skill')
  }
}
