<script setup lang="ts">
// 新任务页：对标 Coze 开场页（居中问候语 + 任务输入组件，默认 Agent「小花颜」）；
// 发送 = 发射台：暂存首条消息（stagePending）并跳转对应 agent 页，
// 该页 consumePending 命中后直接以 chat 态挂载并发出首条消息（跨路由不做停靠动画）。
// 目录以服务端异步加载（server-agent-directory）：默认 Agent 可空，空目录时呈现空态并禁用发送
const defaultAgent = computed(() => getDefaultAgent())

function onSend(text: string) {
  const agent = defaultAgent.value
  if (!agent) return
  stagePending(agent.slug, text)
  navigateTo(`/dashboard/agents/${agent.slug}`)
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 p-6">
    <!-- 问候语 -->
    <h1 class="text-3xl font-semibold">你好，今天想做点什么？</h1>

    <!-- 空目录（未登录/加载失败/目录为空）：输入区不可用，呈现提示 -->
    <div v-if="!defaultAgent" data-test="empty-directory" class="flex flex-col items-center gap-2">
      <p class="text-sm text-base-content/60">目录暂时无法加载，请稍后重试或重新登录</p>
    </div>

    <!-- 任务输入区（与 Agent 开场页共用组件，保持布局对齐；宽度约束在使用方） -->
    <div v-else class="w-full max-w-3xl">
      <TaskComposer
        :agent-name="defaultAgent.name"
        :agent-slug="defaultAgent.slug"
        @send="onSend"
      />
    </div>
  </div>
</template>
