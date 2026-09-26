<script setup lang="ts">
// Agent 任务开场页：按 slug 从 Agent 目录定位，布局与新任务页对齐（共用 TaskComposer）；
// 任务执行逻辑暂未实现，发送先以 toast 反馈占位
// getAgent 显式导入：该名字未进入 Nuxt 自动导入注册表（同文件其余导出正常），显式引用更稳
import { getAgent } from '~/utils/agents'

const route = useRoute()
const agent = computed(() => getAgent(route.params.id as string))
if (!agent.value) {
  throw createError({ statusCode: 404, statusMessage: 'Agent 不存在', fatal: true })
}

const placeholder = computed(() => `告诉${agent.value?.name ?? 'Agent'}，你想先从哪件事开始…`)
const { showToast } = useToast()

function onSend() {
  showToast('任务执行暂未实现', 'info')
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 p-6">
    <!-- 问候语：小球作为 Agent 头像内嵌在标题中 -->
    <h1 class="text-3xl font-semibold">
      今天想让
      <span class="mx-1 inline-flex h-8 w-8 align-middle">
        <EmotionBall emotion="02" />
      </span>
      {{ agent?.name }} 搞定哪件事？
    </h1>

    <!-- 任务输入区（与新任务页共用组件，保持布局对齐） -->
    <TaskComposer
      :agent-name="agent?.name"
      :agent-slug="agent?.slug"
      :placeholder="placeholder"
      @send="onSend"
    />
  </div>
</template>
