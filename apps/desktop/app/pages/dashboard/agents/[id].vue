<script setup lang="ts">
// Agent 页：hero（开场）/ chat（会话停靠）双态（Coze 同型：会话即 agent 页本体）。
// 入场态判定（watch slug immediate：同组件实例跨参数复用时重新判定）——
// pending 交接命中：直接 chat 态并发出首条消息；有缓存会话：直达 chat；否则 hero。
// hero 发送：GSAP Flip 停靠过渡（设计 D2/D3）——问候语淡出（exit await）→ 翻转 phase +
// 追加消息 → nextTick → Flip.from 滑落停靠 + 消息流淡入；chat 态发送仅追加消息。
// getAgent 显式导入（历史上 utils 版本曾漏进自动导入注册表，显式引用更稳，保留习惯）
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { getAgent, useAgents } from '~/composables/useAgents'
import {
  insertModelDivider,
  isGenerating,
  sendMessage,
  stopGenerating,
} from '~/composables/useAgentChat'

const route = useRoute()
const slug = computed(() => route.params.id as string)
const agent = computed(() => getAgent(slug.value))

// 404 门控：目录以服务端异步加载，仅在 loaded 后判定（加载窗口内不误判 404）
const { loaded } = useAgents()
watch(
  [loaded, agent],
  ([isLoaded, current]) => {
    if (isLoaded && !current) {
      throw createError({ statusCode: 404, statusMessage: 'Agent 不存在', fatal: true })
    }
  },
  { immediate: true },
)

const placeholder = computed(() => `告诉${agent.value?.name ?? 'Agent'}，你想先从哪件事开始…`)

// —— 双态状态：phase 管布局，greetingGone 单独管问候语 v-if（淡出动画期间节点须存活，D3）——
const phase = ref<'hero' | 'chat'>('hero')
const greetingGone = ref(false)

// 会话（useAgentChat 响应式单例，sendMessage 后 computed 即感知）
const session = computed(() => getSession(slug.value))

// 生成中状态（停止按钮显隐）：isGenerating 读 reactive Map，computed 可追踪
const generating = computed(() => isGenerating(slug.value))
const { showToast } = useToast()
function onStreamError(message: string): void {
  showToast(message, 'error')
}
function onStop(): void {
  stopGenerating(slug.value)
}

// 模型切换：分割线插入与否由会话侧去重（同款/无会话不插）
function onModelChange(modelId: string, label: string): void {
  insertModelDivider(slug.value, modelId, label)
}

// 用户身份（消息流身份行展示，与侧边栏同源）：挂载后取登录邮箱
const { getSession: getAuthSession } = useAuth()
const userName = ref('')
onMounted(async () => {
  const authSession = await getAuthSession()
  userName.value = authSession?.user.email ?? ''
})

// 入场态判定：首次进入与 slug 变化（侧边栏切 agent，组件复用）都重新执行
function applyEntryState(): void {
  const pending = consumePending(slug.value)
  if (pending !== null || hasSession(slug.value)) {
    if (pending !== null) {
      sendMessage(slug.value, pending.text, pending.images, onStreamError, pending.modelId)
    }
    phase.value = 'chat'
    greetingGone.value = true
  } else {
    phase.value = 'hero'
    greetingGone.value = false
  }
}
watch(slug, applyEntryState, { immediate: true })

// —— 停靠过渡（D2 时序）——
const { enter, exit } = useGsapTransition()
const greetingRef = ref<HTMLElement | null>(null)
// Flip 目标：始终挂载的普通包裹元素（规避组件 $el fragment 锚点，动画规则第 4 条）
const composerWrapRef = ref<HTMLElement | null>(null)
// chat 内容区（顶栏 + 消息流）淡入目标
const chatBodyRef = ref<HTMLElement | null>(null)

// 过渡进行中的重复发送静默追加（不过渡、不叠加动画）
let dockTransitionRunning = false

async function onSend(text: string, images: string[] = [], modelId?: string): Promise<void> {
  if (phase.value === 'chat' || dockTransitionRunning) {
    sendMessage(slug.value, text, images, onStreamError, modelId)
    return
  }
  const wrapEl = composerWrapRef.value
  const state = wrapEl ? Flip.getState(wrapEl) : null
  dockTransitionRunning = true
  // 1) 问候语淡出（exit 先杀在飞 tween，完成可 await；传 .value 真实元素，模板 ref 对象无法归一化）
  await exit(greetingRef.value, { opacity: 0, y: -16, duration: 0.25, ease: 'power2.in' })
  greetingGone.value = true
  // 2) 翻转 phase + 首条消息入列（同一帧呈现）
  sendMessage(slug.value, text, images, onStreamError, modelId)
  phase.value = 'chat'
  await nextTick()
  // 3) composer 滑落停靠 + 消息流淡入（并行）
  if (state && wrapEl) {
    // 注意：Flip.from 的 vars 会透传给宿主 tween，不能带 target 选项（会警告 Invalid property）
    Flip.from(state, {
      duration: 0.45,
      ease: 'power3.inOut',
      // 残留清理（动画规则第 8 条）：完成后移除 Flip 写入的位移/尺寸内联样式
      onComplete: () => gsap.set(wrapEl, { clearProps: 'transform,width,height' }),
    })
  }
  // chat 内容区（顶栏 + 消息流）整体淡入
  enter(chatBodyRef.value, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' })
  dockTransitionRunning = false
}

// 卸载清理：终止可能在飞的 Flip tween（防写入分离节点）；enter/exit 的 tween
// 由 useGsapTransition 的 scope 回收兜底
onUnmounted(() => {
  if (composerWrapRef.value) gsap.killTweensOf(composerWrapRef.value)
})
</script>

<template>
  <!-- hero: 垂直居中开场；chat: 消息流撑满滚动、输入区钉底（页面不滚，内层滚） -->
  <div
    class="flex h-full flex-col p-6"
    :class="phase === 'hero' ? 'items-center justify-center gap-8' : 'overflow-hidden'"
  >
    <!-- 问候语：小球作为 Agent 头像内嵌在标题中（greetingGone 独立控制，淡出完成后卸载） -->
    <h1 v-if="!greetingGone" ref="greetingRef" class="text-3xl font-semibold">
      今天想让
      <span class="mx-1 inline-flex h-8 w-8 align-middle">
        <EmotionBall :emotion="agent?.emotion" :color="agent?.color" />
      </span>
      {{ agent?.name }} 搞定哪件事？
    </h1>

    <!-- chat 内容区：顶栏（Agent 名 + 在线）+ 消息流，作为一个整体淡入 -->
    <div v-if="phase === 'chat'" ref="chatBodyRef" class="flex min-h-0 flex-1 flex-col">
      <!-- 顶栏固定不随消息滚动：名字点开 Agent 信息卡（Coze 同型；无发消息/新项目按钮与渠道区块） -->
      <div data-test="chat-header" class="flex shrink-0 items-center gap-2 px-1 pb-3">
        <div class="dropdown dropdown-start">
          <div
            tabindex="0"
            role="button"
            data-test="agent-card-trigger"
            class="cursor-pointer rounded-lg text-base font-medium transition-colors hover:text-primary"
          >
            {{ agent?.name }}
          </div>
          <div
            tabindex="0"
            data-test="agent-card"
            class="dropdown-content z-30 mt-2 w-80 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-xl shadow-base-content/5"
          >
            <!-- 大头像 + 名字 + 身份 -->
            <div class="flex flex-col items-center gap-2 border-b border-base-200 pb-4">
              <span class="h-20 w-20">
                <EmotionBall :emotion="agent?.emotion" :color="agent?.color" />
              </span>
              <p class="text-lg font-medium">{{ agent?.name }}</p>
              <p class="flex items-center gap-1 text-xs text-base-content/50">
                AI Agent
                <span class="h-1.5 w-1.5 rounded-full bg-success" />
                在线
              </p>
            </div>
            <!-- 已开启技能（目录 skills 字段） -->
            <div class="pt-4">
              <p class="mb-2 text-xs text-base-content/50">
                已开启技能 · {{ agent?.skills?.length ?? 0 }}
              </p>
              <div v-if="agent?.skills?.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="skill in agent.skills"
                  :key="skill"
                  class="rounded-full border border-base-300 px-3 py-1 text-xs text-base-content/70"
                >
                  {{ skill }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <span class="flex items-center gap-1 text-xs text-base-content/50">
          <span class="h-1.5 w-1.5 rounded-full bg-success" />
          在线
        </span>
      </div>

      <!-- 消息流：状态源在 useAgentChat，组件内新消息自动滚底 -->
      <ChatMessageList
        :messages="session?.messages ?? []"
        :agent-slug="slug"
        :user-name="userName"
      />
    </div>

    <!-- 输入区包裹层（Flip 目标）：hero 居中定宽；chat 全宽钉底，宽度差由 Flip 过渡 -->
    <div ref="composerWrapRef" :class="phase === 'chat' ? 'w-full' : 'mx-auto w-full max-w-3xl'">
      <TaskComposer
        :agent-name="agent?.name"
        :agent-slug="slug"
        :placeholder="placeholder"
        :show-agent-selector="phase === 'hero'"
        :generating="generating"
        @send="onSend"
        @stop="onStop"
        @model-change="onModelChange"
      />
    </div>
  </div>
</template>
