/**
 * 模型供应商注册表：记录结构与 findModelProvider 是模型选择的唯一入口。
 * 注册表当前为代码内常量，更换存储形态时调用方不变。
 */

/** 供应商注册记录 */
export interface ModelProviderRecord {
  /** 供应商标识 */
  id: string
  /** API 端点 */
  baseUrl: string
  /** 可用模型列表 */
  models: readonly string[]
  /** 未显式指定模型时的默认值 */
  defaultModel: string
  /** apiKey 所在环境变量名（key 本体只在服务端 env，不进代码/表） */
  apiKeyEnv: string
}

/** DeepSeek：当前官方模型名 deepseek-flash / deepseek-v4-pro（旧 deepseek-chat 已退役） */
export const DEEPSEEK_PROVIDER: ModelProviderRecord = {
  id: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  models: ['deepseek-flash', 'deepseek-v4-pro'],
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
    if (provider.models.includes(modelId)) return { provider, model: modelId }
  }
  return undefined
}
