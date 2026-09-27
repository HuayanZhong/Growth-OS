// Emotion Ball 节奏缩放：上游 seed 的待机节奏（眼环轮换/眨眼/表情切换）偏慢，
// 引擎无全局速度选项，但 config.register 同 ID 重注册会覆盖定义（registry.set）——
// 由此在封装层调快节奏且 vendored 文件零改动。本 helper 只缩放三个节奏字段，
// 其余字段原样透传（引擎 validate 仅校验 id/name/group/anims/sequence，数值无门槛）。
// 纯函数、无 DOM/引擎依赖，便于 node 单测。

export interface EmotionTempoDef {
  id: string
  poolMs?: [number, number] | null
  blinkMs?: [number, number] | null
  transition?: number
}

// 缩放 [min, max] 区间并取整（元组索引在 noUncheckedIndexedAccess 下仍为 number）
function scaleRange(range: [number, number], factor: number): [number, number] {
  return [Math.round(range[0] * factor), Math.round(range[1] * factor)]
}

// 返回节奏加快后的副本：poolMs/blinkMs/transition × factor；
// blinkMs: null（不眨眼）与 undefined（未定义）语义保持不变
export function scaleEmotionTempo<T extends EmotionTempoDef>(raw: T, factor: number): T {
  const out = { ...raw }
  if (Array.isArray(raw.poolMs)) out.poolMs = scaleRange(raw.poolMs, factor)
  if (Array.isArray(raw.blinkMs)) out.blinkMs = scaleRange(raw.blinkMs, factor)
  if (typeof raw.transition === 'number') out.transition = Math.round(raw.transition * factor)
  return out as T
}
