import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectsController } from '../../../src/modules/projects/projects.controller.ts'
import { ProjectsService } from '../../../src/modules/projects/projects.service.ts'

/** Project 域骨架行为：读路径空态，写路径 501 NOT_IMPLEMENTED。 */
describe('ProjectsController（骨架）', () => {
  let controller: ProjectsController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [ProjectsService],
    }).compile()
    controller = moduleRef.get(ProjectsController)
  })

  it('列表返回空数组', () => {
    expect(controller.list()).toEqual([])
  })

  it('详情无数据抛 NotFoundException', () => {
    expect(() => controller.get('p1')).toThrow(NotFoundException)
  })

  it('创建/更新/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.create({ name: 'p' })).toThrow(NotImplementedException)
    expect(() => controller.update('p1', { name: 'q' })).toThrow(NotImplementedException)
    expect(() => controller.remove('p1')).toThrow(NotImplementedException)
  })
})
