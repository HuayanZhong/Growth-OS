<script setup lang="ts">
// 新任务页：对标 Coze 开场页（居中问候语 + 任务输入组件，默认 Agent「小花颜」）；
// 发送 = 发射台：暂存首条消息（stagePending）并跳转对应 agent 页，
// 该页 consumePending 命中后直接以 chat 态挂载并发出首条消息（跨路由不做停靠动画）。
// 目录以服务端异步加载（server-agent-directory）：loaded/loadError 派生四态互斥呈现
// （加载中 / 加载失败可重试 / 目录为空 / 就绪）；会话失效不进入错误态，
// 由 apiFetch 统一出口接管（本地登出 + 回登录页）
const { loaded, loadError, loadAgents } = useAgents()
const defaultAgent = computed(() => getDefaultAgent())

function onSend(text: string, images: string[] = [], modelId?: string) {
  const agent = defaultAgent.value
  if (!agent) return
  stagePending(agent.slug, text, images, modelId)
  navigateTo(`/dashboard/agents/${agent.slug}`)
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-8 p-6">
    <!-- 问候语 -->
    <h1 class="text-3xl font-semibold">你好，今天想做点什么？</h1>

    <!-- 加载中：不呈现错误/空态文案（消除首帧闪现） -->
    <div
      v-if="!loaded && !loadError"
      data-test="directory-loading"
      class="loading loading-dots loading-md text-base-content/40"
    />

    <!-- 加载失败（会话仍有效，如 5xx/断网）：错误提示 + 重试；不引导"重新登录" -->
    <div v-else-if="loadError" data-test="directory-error" class="flex flex-col items-center gap-3">
      <p class="text-sm text-base-content/60">目录加载失败，请检查网络后重试</p>
      <button class="btn btn-outline btn-sm" data-test="directory-retry" @click="loadAgents()">
        重试
      </button>
    </div>

    <!-- 目录为空（加载成功但无默认 Agent）：空态提示，发送不可用 -->
    <div
      v-else-if="!defaultAgent"
      data-test="empty-directory"
      class="flex flex-col items-center gap-2"
    >
      <p class="text-sm text-base-content/60">暂无可用 Agent</p>
    </div>

    <!-- 就绪：任务输入区（与 Agent 开场页共用组件，保持布局对齐；宽度约束在使用方） -->
    <div v-else class="w-full max-w-3xl">
      <TaskComposer
        :agent-name="defaultAgent.name"
        :agent-slug="defaultAgent.slug"
        @send="onSend"
      />
    </div>
  </div>
</template>
