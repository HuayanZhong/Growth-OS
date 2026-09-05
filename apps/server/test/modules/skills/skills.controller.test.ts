import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { SkillsController } from '../../../src/modules/skills/skills.controller.ts'
import { SkillsService } from '../../../src/modules/skills/skills.service.ts'

/** Skill 域骨架行为：读路径空态，写路径 501 NOT_IMPLEMENTED。 */
describe('SkillsController（骨架）', () => {
  let controller: SkillsController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SkillsController],
      providers: [SkillsService],
    }).compile()
    controller = moduleRef.get(SkillsController)
  })

  it('列表返回空数组', () => {
    expect(controller.list()).toEqual([])
  })

  it('详情无数据抛 NotFoundException', () => {
    expect(() => controller.get('sk1')).toThrow(NotFoundException)
  })

  it('注册/更新/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.create({ name: 's' })).toThrow(NotImplementedException)
    expect(() => controller.update('sk1', { enabled: true })).toThrow(NotImplementedException)
    expect(() => controller.remove('sk1')).toThrow(NotImplementedException)
  })
})
