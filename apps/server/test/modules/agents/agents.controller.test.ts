import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { AgentsController } from '../../../src/modules/agents/agents.controller.ts'
import { AgentsService } from '../../../src/modules/agents/agents.service.ts'

/**
 * Agent 域骨架行为：读路径空态（列表 [] / 详情 404），写路径 501 NOT_IMPLEMENTED。
 */
describe('AgentsController（骨架）', () => {
  let controller: AgentsController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [AgentsService],
    }).compile()
    controller = moduleRef.get(AgentsController)
  })

  it('列表返回空数组（骨架空存储）', () => {
    expect(controller.list()).toEqual([])
  })

  it('详情无数据抛 NotFoundException（信封码 NOT_FOUND）', () => {
    expect(() => controller.get('a1')).toThrow(NotFoundException)
    try {
      controller.get('a1')
    } catch (err) {
      expect((err as NotFoundException).getResponse()).toMatchObject({ code: 'NOT_FOUND' })
    }
  })

  it('创建/更新/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.create({ name: 'a', systemPrompt: 'p', model: 'm' })).toThrow(
      NotImplementedException,
    )
    expect(() => controller.update('a1', { name: 'b' })).toThrow(NotImplementedException)
    expect(() => controller.remove('a1')).toThrow(NotImplementedException)

    try {
      controller.create({ name: 'a', systemPrompt: 'p', model: 'm' })
    } catch (err) {
      expect((err as NotImplementedException).getResponse()).toMatchObject({
        code: 'NOT_IMPLEMENTED',
      })
    }
  })
})
