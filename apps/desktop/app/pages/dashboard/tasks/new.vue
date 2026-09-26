<script setup lang="ts">
// 新任务页：对标 Coze 开场页（居中问候语 + 任务输入组件，默认 Agent「小花颜」）；
// 任务执行逻辑暂未实现，发送先以 toast 反馈占位
const defaultAgent = getDefaultAgent()
const { showToast } = useToast()

function onSend() {
  showToast('任务执行暂未实现', 'info')
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 p-6">
    <!-- 问候语 -->
    <h1 class="text-3xl font-semibold">你好，今天想做点什么？</h1>

    <!-- 任务输入区（与 Agent 开场页共用组件，保持布局对齐） -->
    <TaskComposer :agent-name="defaultAgent.name" :agent-slug="defaultAgent.slug" @send="onSend" />
  </div>
</template>
