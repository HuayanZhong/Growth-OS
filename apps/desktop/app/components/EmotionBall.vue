<script setup lang="ts">
// EmotionBall：AI 表情小球（SVG 实时驱动，眼睛跟随鼠标 / 呼吸 / 情绪切换）
// 来源：https://github.com/sam70361/aora-bot（emotion-ball/ 目录）
// 许可：Emotion Ball Community License —— 非商业免费使用，须注明出处；
//       表情引擎与表情数据可另行商业授权（LICENSE-COMMERCIAL.md），
//       球形角色视觉形象永不商用。Growth OS 仅作非商业使用。
// 引擎为 IIFE 全局脚本（window.EmotionBall），按 rings → emotions → ball → engine
// 顺序从 public/ 注入一次（模块级 Promise 缓存，多实例共享）；尺寸由父容器决定。
interface EmotionBallInstance {
  setEmotion(id: string): void
  destroy(): void
}

interface EmotionBallGlobal {
  create(el: HTMLElement, opts?: { emotion?: string; idle?: boolean }): EmotionBallInstance
}

const props = withDefaults(defineProps<{ emotion?: string }>(), { emotion: '02' })

const hostEl = ref<HTMLElement | null>(null)
let ball: EmotionBallInstance | null = null

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
  })()
  return scriptsPromise
}

onMounted(async () => {
  if (!hostEl.value) return
  try {
    await loadScripts()
  } catch (error) {
    console.warn('[EmotionBall] 加载失败，占位为空球', error)
    return
  }
  ball =
    (window as Window & { EmotionBall?: EmotionBallGlobal }).EmotionBall?.create(hostEl.value, {
      emotion: props.emotion,
      idle: true,
    }) ?? null
})

watch(
  () => props.emotion,
  (id) => {
    ball?.setEmotion(id)
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
