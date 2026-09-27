import { describe, expect, it } from 'vitest'
import { scaleEmotionTempo } from '../../app/utils/emotionTempo'
import type { EmotionTempoDef } from '../../app/utils/emotionTempo'

/**
 * Emotion Ball 节奏缩放单元测试：poolMs/blinkMs/transition × 因子，
 * 其余字段透传，null/undefined 语义保持。
 * 注意：元组字段须显式标注（裸字面量推断 number[]、as const 变 readonly，均不满足约束）
 */
describe('scaleEmotionTempo', () => {
  it('按因子缩放三个节奏字段并取整，其余字段原样保留', () => {
    const raw: EmotionTempoDef & {
      name: string
      group: string
      antics: boolean
    } = {
      id: '10',
      name: '开心',
      group: 'emotion',
      poolMs: [2500, 4500],
      blinkMs: [2500, 5000],
      transition: 380,
      antics: true,
    }
    const scaled = scaleEmotionTempo(raw, 0.5)
    expect(scaled.poolMs).toEqual([1250, 2250])
    expect(scaled.blinkMs).toEqual([1250, 2500])
    expect(scaled.transition).toBe(190)
    // 非节奏字段透传
    expect(scaled.id).toBe('10')
    expect(scaled.name).toBe('开心')
    expect(scaled.group).toBe('emotion')
    expect(scaled.antics).toBe(true)
  })

  it('blinkMs: null（不眨眼）保持 null；未定义字段保持缺失', () => {
    const scaled = scaleEmotionTempo({ id: '00', blinkMs: null, transition: 900 }, 0.5)
    expect(scaled.blinkMs).toBeNull()
    expect(scaled.transition).toBe(450)
    expect('poolMs' in scaled ? scaled.poolMs : undefined).toBeUndefined()
  })

  it('缩放后仍为合法元组区间（min ≤ max）', () => {
    const input: EmotionTempoDef = { id: '13', poolMs: [3, 7] }
    const scaled = scaleEmotionTempo(input, 0.5)
    const [min, max] = scaled.poolMs ?? []
    expect(min).toBeLessThanOrEqual(max ?? 0)
    expect(min).toBeGreaterThan(0)
  })
})
