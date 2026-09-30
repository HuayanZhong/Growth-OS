/**
 * 模型供应商注册表：记录结构、findModelProvider 与模型能力查询是模型
 * 选择的唯一入口。注册表当前为代码内常量，更换存储形态时调用方不变。
 */

/** 模型能力记录（模块内构件：对外仅暴露供应商记录与查询函数） */
interface ModelCapabilityRecord {
  /** 模型 id（请求契约 modelId 与上游 API 模型名同值） */
  id: string
  /** 是否具备视觉能力（可消费 image_url 消息分段） */
  vision: boolean
}

/** 供应商注册记录 */
export interface ModelProviderRecord {
  /** 供应商标识 */
  id: string
  /** API 端点 */
  baseUrl: string
  /** 可用模型及能力标注 */
  models: readonly ModelCapabilityRecord[]
  /** 未显式指定模型时的默认值 */
  defaultModel: string
  /** apiKey 所在环境变量名（key 本体只在服务端 env，不进代码/表） */
  apiKeyEnv: string
}

/** DeepSeek：deepseek-flash（V4.1-Flash）原生多模态；deepseek-v4-pro 为纯文本模型 */
export const DEEPSEEK_PROVIDER: ModelProviderRecord = {
  id: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  models: [
    { id: 'deepseek-flash', vision: true },
    { id: 'deepseek-v4-pro', vision: false },
  ],
  defaultModel: 'deepseek-flash',
  apiKeyEnv: 'DEEPSEEK_API_KEY',
}

/** 当前注册表：仅 DeepSeek 一行 */
const MODEL_PROVIDER_REGISTRY: readonly ModelProviderRecord[] = [DEEPSEEK_PROVIDER]

/** 模型定位结果：模型 id 归属的供应商记录 + 具体模型名 */
export interface ModelProviderTarget {
  provider: ModelProviderRecord
  model: string
}

/**
 * 按模型 id 查注册表（模型 id 即模型名，跨供应商重名时首行命中）。
 * 未命中返回 undefined，由调用方决定报错形态。
 */
export function findModelProvider(modelId: string): ModelProviderTarget | undefined {
  for (const provider of MODEL_PROVIDER_REGISTRY) {
    const entry = provider.models.find((model) => model.id === modelId)
    if (entry) return { provider, model: entry.id }
  }
  return undefined
}

/** 模型 id 是否在注册表内（请求校验用：未知 modelId 在流建立前拒绝） */
export function isRegisteredModel(modelId: string): boolean {
  return findModelProvider(modelId) !== undefined
}

/** 模型是否具备视觉能力（未注册模型视为不具备） */
export function isVisionModel(modelId: string): boolean {
  for (const provider of MODEL_PROVIDER_REGISTRY) {
    if (provider.models.some((model) => model.id === modelId && model.vision)) return true
  }
  return false
}

/**
 * Auto 路由：按请求内容选模型。携带图片分段时选首个具备视觉能力的模型，
 * 纯文本走注册表默认模型。
 */
export function resolveAutoModelId(hasImageSegments: boolean): string {
  if (hasImageSegments) {
    for (const provider of MODEL_PROVIDER_REGISTRY) {
      const vision = provider.models.find((model) => model.vision)
      if (vision) return vision.id
    }
  }
  const first = MODEL_PROVIDER_REGISTRY[0]
  if (!first) throw new Error('模型供应商注册表为空，无法解析默认模型')
  return first.defaultModel
}
