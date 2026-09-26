import { describe, expect, it } from 'vitest'
import { MODEL_LIST } from '../../app/utils/models'

/**
 * 模型目录测试：目录不变量（默认唯一、id 唯一、条目字段完整）
 */
describe('模型目录', () => {
  it('默认模型恰好一个', () => {
    const defaults = MODEL_LIST.filter((model) => model.isDefault)
    expect(defaults).toHaveLength(1)
  })

  it('模型 id 唯一', () => {
    const ids = MODEL_LIST.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('条目字段完整（id/name 非空）', () => {
    for (const model of MODEL_LIST) {
      expect(model.id.length).toBeGreaterThan(0)
      expect(model.name.length).toBeGreaterThan(0)
    }
  })
})
