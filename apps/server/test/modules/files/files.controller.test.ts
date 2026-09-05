import { NotFoundException, NotImplementedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'
import { FilesController } from '../../../src/modules/files/files.controller.ts'
import { FilesService } from '../../../src/modules/files/files.service.ts'

/** File 域骨架行为：列表/详情空态，上传与删除 501 NOT_IMPLEMENTED。 */
describe('FilesController（骨架）', () => {
  let controller: FilesController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [FilesService],
    }).compile()
    controller = moduleRef.get(FilesController)
  })

  it('列表返回空数组', () => {
    expect(controller.list()).toEqual([])
  })

  it('详情无数据抛 NotFoundException', () => {
    expect(() => controller.get('f1')).toThrow(NotFoundException)
  })

  it('上传/删除抛 501 NOT_IMPLEMENTED', () => {
    expect(() => controller.upload({ name: 'a.txt', mimeType: 'text/plain' })).toThrow(
      NotImplementedException,
    )
    expect(() => controller.remove('f1')).toThrow(NotImplementedException)
  })
})
