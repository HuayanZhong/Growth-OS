// 创建 Agent 表单状态机：从 CreateAgentModal.vue 抽出的全部表单状态与业务流
// （SFC 只剩视图组装与事件接线）。submit = createAgent（POST 服务端）+ navigateTo；
// 提交期间 submitting 置位防重复，失败时 error 带出中文文案（弹窗呈现，表单保留）。
// reset() 由宿主在弹窗打开时调用——打开即重置，任何关闭路径（取消/Esc/遮罩）不残留输入。
// 相对路径引 utils：与 useAgents.ts 同纪律（node 环境可测、依赖方向 utils → composables 单向）
import { computed, reactive, ref } from 'vue'
import { createAgent } from './useAgents'
import {
  AGENT_AVATAR_OPTIONS,
  AVATAR_COLOR_OPTIONS,
  DEFAULT_AVATAR_COLOR,
  DEFAULT_AVATAR_EMOTION,
} from '../utils/agents'

export function useCreateAgentForm() {
  const name = ref('')
  const description = ref('')
  const selectedEmotion = ref(DEFAULT_AVATAR_EMOTION)
  const selectedColor = ref(DEFAULT_AVATAR_COLOR)
  const selectedSkills = ref<string[]>([])
  const submitting = ref(false)
  const error = ref('')

  // 名称必填：去除空白后非空才允许创建
  const canCreate = computed(() => name.value.trim().length > 0)

  const selectedEmotionName = computed(
    () => AGENT_AVATAR_OPTIONS.find((option) => option.id === selectedEmotion.value)?.name,
  )
  const selectedColorName = computed(
    () => AVATAR_COLOR_OPTIONS.find((option) => option.id === selectedColor.value)?.name,
  )

  // 打开即重置：任何关闭路径后再次打开都不残留上次输入
  function reset() {
    name.value = ''
    description.value = ''
    selectedEmotion.value = DEFAULT_AVATAR_EMOTION
    selectedColor.value = DEFAULT_AVATAR_COLOR
    selectedSkills.value = []
    submitting.value = false
    error.value = ''
  }

  // 技能选择弹窗确定后回填
  function confirmSkills(skills: string[]) {
    selectedSkills.value = skills
  }

  // 提交：POST 服务端（slug 由服务端生成），成功后路由切换到新开场页（延续「切 Agent 即切路由」）。
  // submitting 门控防重复提交；失败呈现错误且保留表单（不关闭、不跳转），可修正后重试
  async function submit(): Promise<boolean> {
    if (!canCreate.value || submitting.value) return false
    const trimmedDescription = description.value.trim()
    submitting.value = true
    error.value = ''
    try {
      const agent = await createAgent({
        name: name.value.trim(),
        emotion: selectedEmotion.value,
        color: selectedColor.value,
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
        ...(selectedSkills.value.length ? { skills: [...selectedSkills.value] } : {}),
      })
      await navigateTo(`/dashboard/agents/${agent.slug}`)
      return true
    } catch (err) {
      error.value = err instanceof Error && err.message ? err.message : '创建失败，请稍后重试'
      return false
    } finally {
      submitting.value = false
    }
  }

  // reactive 包裹返回：模板/宿主直接读写属性（ref 自动解包），v-model 与赋值均可用
  return reactive({
    name,
    description,
    selectedEmotion,
    selectedColor,
    selectedSkills,
    submitting,
    error,
    canCreate,
    selectedEmotionName,
    selectedColorName,
    reset,
    confirmSkills,
    submit,
  })
}
