<script setup lang="ts">
// EmotionBall：AI 表情小球（SVG 实时驱动，眼睛跟随鼠标 / 呼吸 / 情绪切换）
// 来源：https://github.com/sam70361/aora-bot（emotion-ball/ 目录）
// 许可：Emotion Ball Community License —— 非商业免费使用，须注明出处；
//       表情引擎与表情数据可另行商业授权（LICENSE-COMMERCIAL.md），
//       球形角色视觉形象永不商用。Growth OS 仅作非商业使用。
// 引擎为 IIFE 全局脚本（window.EmotionBall），按 rings → emotions → ball → engine
// 顺序从 public/ 注入一次（模块级 Promise 缓存，多实例共享）；尺寸由父容器决定。
// 注入完成后对 seed 做节奏重注册（调快待机节奏，vendored 文件零改动，见 emotionTempo.ts）；
// color prop 透传引擎 create（_theme 每帧覆盖身体/眼白颜色），运行时换色经重建实例实现
import { scaleEmotionTempo } from '~/utils/emotionTempo'
import type { EmotionTempoDef } from '~/utils/emotionTempo'

interface EmotionBallInstance {
  setEmotion(id: string): void
  destroy(): void
}

interface EmotionBallGlobal {
  create(
    el: HTMLElement,
    opts?: { emotion?: string; idle?: boolean; color?: string },
  ): EmotionBallInstance
  config?: {
    register(raw: EmotionTempoDef): { ok: boolean; id?: string; errors?: string[] }
  }
}

// 待机节奏倍率：<1 加快（poolMs/blinkMs/transition 缩短），上游默认观感偏慢
const TEMPO_FACTOR = 0.5

const props = withDefaults(defineProps<{ emotion?: string; color?: string }>(), {
  emotion: '02',
  color: undefined,
})

const hostEl = ref<HTMLElement | null>(null)
let ball: EmotionBallInstance | null = null

// 节奏补丁：对 window.EMOTION_SEED 逐条缩放后重注册（同 ID 覆盖）；单条失败 warn 跳过
function applyTempoPatch(): void {
  const w = window as Window & { EmotionBall?: EmotionBallGlobal; EMOTION_SEED?: EmotionTempoDef[] }
  const seed = w.EMOTION_SEED
  if (!w.EmotionBall?.config || !Array.isArray(seed)) return
  for (const raw of seed) {
    const result = w.EmotionBall.config.register(scaleEmotionTempo(raw, TEMPO_FACTOR))
    if (!result.ok) console.warn(`[EmotionBall] 节奏重注册跳过: ${raw.id}`, result.errors)
  }
}

let scriptsPromise: Promise<void> | null = null
function loadScripts(): Promise<void> {
  if (scriptsPromise) return scriptsPromise
  scriptsPromise = (async () => {
    for (const name of ['rings', 'emotions', 'ball', 'engine']) {
      await new Promise<void>((resolve, reject) => {
        const el = document.createElement('script')
        el.src = `/emotion-ball/${name}.js`
        el.addEventListener('load', () => resolve())
        el.addEventListener('error', () => reject(new Error(`EmotionBall 脚本加载失败: ${name}`)))
        document.head.appendChild(el)
      })
    }
    applyTempoPatch()
  })()
  return scriptsPromise
}

// 创建/重建实例：color 变更无运行时 API，经 destroy + create 实现（destroy 会移除旧 SVG）
async function mountBall(): Promise<void> {
  if (!hostEl.value) return
  try {
    await loadScripts()
  } catch (error) {
    console.warn('[EmotionBall] 加载失败，占位为空球', error)
    return
  }
  ball?.destroy()
  ball =
    (window as Window & { EmotionBall?: EmotionBallGlobal }).EmotionBall?.create(hostEl.value, {
      emotion: props.emotion,
      idle: true,
      ...(props.color ? { color: props.color } : {}),
    }) ?? null
}

onMounted(() => {
  void mountBall()
})

watch(
  () => props.emotion,
  (id) => {
    ball?.setEmotion(id)
  },
)

watch(
  () => props.color,
  () => {
    void mountBall()
  },
)

onUnmounted(() => {
  ball?.destroy()
  ball = null
})
</script>

<template>
  <!-- translate-y 补偿上游 viewBox 上下留白不等（上 15 / 下 31），使球体光学居中，随尺寸等比缩放 -->
  <div ref="hostEl" class="h-full w-full translate-y-[6%]" aria-hidden="true" />
</template>
