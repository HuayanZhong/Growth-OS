<script setup lang="ts">
// 任务输入组件：输入卡片 + 垫层 Agent 选择条（新任务页与 Agent 开场页共用，保持布局对齐）
// 下拉即 Agent 目录（AGENT_LIST）：选择即路由切换（/dashboard/agents/:slug），当前 Agent 高亮；
// 模型选择为纯前端状态（MODEL_LIST 静态目录），模型后端接入后随任务提交
const props = withDefaults(
  defineProps<{ agentName?: string; placeholder?: string; agentSlug?: string }>(),
  { agentName: '小花颜', placeholder: '说说你想做什么…', agentSlug: undefined },
)

const emit = defineEmits<{ send: [text: string] }>()

// 输入草稿：发送按钮随内容启用，空内容/纯空白禁用
const draft = ref('')

const canSend = computed(() => draft.value.trim().length > 0)

function send() {
  if (!canSend.value) return
  emit('send', draft.value.trim())
  draft.value = ''
}

// 当前选中模型：默认取目录中的默认项；选择后仅更新本地状态（弹层随焦点移出关闭）
const selectedModel = ref<ModelEntry | undefined>(MODEL_LIST.find((model) => model.isDefault))

function selectModel(model: ModelEntry) {
  selectedModel.value = model
  ;(document.activeElement as HTMLElement | null)?.blur()
}

// 两个弹层共用容器/条目样式：与输入卡片同一套投影语言，选中态用对勾而非色块
const menuClass =
  'dropdown-content z-20 mt-1 w-52 rounded-xl border border-base-300/60 bg-base-100 p-1 shadow-xl shadow-base-content/5'
const menuItemClass =
  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-base-content/80 transition-colors hover:bg-base-content/5'
</script>

<template>
  <div class="w-full max-w-3xl">
    <!-- 输入卡片（顶层）：纵向渐变面 + 大而软的投影，悬浮在垫层之上 -->
    <div
      class="relative z-10 rounded-3xl border border-base-300 bg-linear-to-b from-base-100 to-base-200 shadow-xl shadow-base-content/5"
    >
      <textarea
        v-model="draft"
        class="h-24 w-full resize-none bg-transparent px-4 pt-4 leading-relaxed focus:outline-none"
        :placeholder="placeholder"
        @keydown.enter.exact.prevent="send"
      />
      <div class="flex items-center justify-between px-3 pb-3">
        <div class="flex items-center gap-0.5">
          <button type="button" class="btn btn-circle btn-ghost btn-sm" title="添加附件">
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              viewBox="0 0 24 24"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>

          <!-- 模型选择：向上弹出，当前选中项高亮 -->
          <div class="dropdown dropdown-top dropdown-start">
            <div
              tabindex="0"
              role="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-base-content/60"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <rect x="5" y="5" width="14" height="14" rx="2" />
                <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
                <path d="M9 2v3" />
                <path d="M15 2v3" />
                <path d="M9 19v3" />
                <path d="M15 19v3" />
                <path d="M2 9h3" />
                <path d="M2 15h3" />
                <path d="M19 9h3" />
                <path d="M19 15h3" />
              </svg>
              <span>{{ selectedModel?.name ?? '选择模型' }}</span>
              <svg
                class="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <ul :class="menuClass" tabindex="0">
              <li v-for="model in MODEL_LIST" :key="model.id">
                <button type="button" :class="menuItemClass" @click="selectModel(model)">
                  <span
                    class="flex-1 text-left"
                    :class="model.id === selectedModel?.id ? 'font-medium text-base-content' : ''"
                  >
                    {{ model.name }}
                  </span>
                  <span v-if="model.isDefault" class="text-xs text-base-content/40">默认</span>
                  <svg
                    v-if="model.id === selectedModel?.id"
                    class="h-4 w-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-circle btn-primary btn-sm"
          :disabled="!canSend"
          title="发送"
          @click="send"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="m5 12 7-7 7 7" />
            <path d="M12 19V5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 垫层（底层）：缩进更多、圆角更小、颜色更深（近大远小），上沿压入卡片底下，带接地投影；
         pt 需补偿被卡片压住的部分（-mt-4 = 16px），可见区上下各 4px 使触发器垂直居中且总高不变 -->
    <div
      class="-mt-4 mx-6 rounded-b-xl border border-t-0 border-base-300 bg-base-300/60 px-2 pb-1 pt-4 shadow-md shadow-base-content/5"
    >
      <div class="dropdown dropdown-top dropdown-start">
        <div
          tabindex="0"
          role="button"
          class="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-base-content/80"
        >
          <span class="h-5 w-5 shrink-0">
            <EmotionBall emotion="02" />
          </span>
          <span>{{ props.agentName }}</span>
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <ul :class="menuClass" tabindex="0">
          <li v-for="agent in AGENT_LIST" :key="agent.slug">
            <NuxtLink :to="`/dashboard/agents/${agent.slug}`" :class="menuItemClass">
              <span class="h-5 w-5 shrink-0">
                <EmotionBall emotion="02" />
              </span>
              <span
                class="flex-1 text-left"
                :class="agent.slug === props.agentSlug ? 'font-medium text-base-content' : ''"
              >
                {{ agent.name }}
              </span>
              <span v-if="agent.isDefault" class="text-xs text-base-content/40">默认</span>
              <svg
                v-if="agent.slug === props.agentSlug"
                class="h-4 w-4 text-primary"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
