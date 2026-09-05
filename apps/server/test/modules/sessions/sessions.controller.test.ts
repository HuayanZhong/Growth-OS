import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { SessionsController } from '../../../src/modules/sessions/sessions.controller.ts'
import { SessionsService } from '../../../src/modules/sessions/sessions.service.ts'

/**
 * Session 域骨架行为：事件序列与消息投影为空（事件存储阶段三接入），
 * CRUD 写路径 501 NOT_IMPLEMENTED。
 */
describe('SessionsController（骨架）', () => {
  let controller: SessionsController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [SessionsService],
    }).compile()
    controller = moduleRef.get(SessionsController)
  })

  it('列表与事件序列为空，消息投影为空历史', () => {
    expect(controller.list()).toEqual([])
    expect(controller.listEvents('s1')).toEqual([])
    expect(controller.listMessages('s1')).toEqual([])
  })

  it('详情无数据抛 NotFoundException', () => {
    expect(() => controller.get('s1')).toThrow(NotFoundException)
  })

  it('创建/更新/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.create({ agentId: 'a1' })).toThrow(NotImplementedException)
    expect(() => controller.update('s1', { title: 't' })).toThrow(NotImplementedException)
    expect(() => controller.remove('s1')).toThrow(NotImplementedException)
  })
})
