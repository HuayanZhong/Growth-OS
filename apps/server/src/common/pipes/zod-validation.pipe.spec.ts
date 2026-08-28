import { describe, it, expect } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe.ts'

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int(),
  })
  const pipe = new ZodValidationPipe(schema)
  const metadata = { type: 'body' as const, metatype: Object, data: '' }

  it('合法输入返回解析后的数据（含 coercion）', () => {
    expect(pipe.transform({ name: '小芽', age: '18' }, metadata)).toEqual({ name: '小芽', age: 18 })
  })

  it('非法输入抛 BadRequestException 并携带 VALIDATION_ERROR 信封', () => {
    try {
      pipe.transform({ name: '', age: 'abc' }, metadata)
      expect.unreachable('应当抛出 BadRequestException')
    } catch (err) {
      const e = err as BadRequestException
      expect(e).toBeInstanceOf(BadRequestException)
      const res = e.getResponse() as { code: string; details: Array<{ path: string }> }
      expect(res.code).toBe('VALIDATION_ERROR')
      expect(res.details.some((d) => d.path === 'age')).toBe(true)
    }
  })

  it('缺失字段同样触发校验失败', () => {
    expect(() => pipe.transform({}, metadata)).toThrow(BadRequestException)
  })
})
