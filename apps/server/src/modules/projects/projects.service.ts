import { Injectable, NotImplementedException } from '@nestjs/common'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@growth-os/types'
import { notImplemented } from '../../common/errors/not-implemented.ts'

/**
 * Project 域 service（骨架，迭代计划 2.6）。
 * 聚合根以 id 引用列表串联四类资源；阶段四接入持久化。
 */
@Injectable()
export class ProjectsService {
  list(): Project[] {
    return []
  }

  getById(_id: string): Project | null {
    return null
  }

  create(_input: CreateProjectInput): Project {
    throw notImplemented('创建项目')
  }

  update(_id: string, _input: UpdateProjectInput): Project {
    throw notImplemented('更新项目')
  }

  remove(_id: string): void {
    throw notImplemented('删除项目')
  }
}
