import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ChatDeepSeek } from '@langchain/deepseek'
import { findModelProvider } from './registry.ts'

/**
 * 模型工厂接口位：(modelId) => langchain 模型实例。
 * 调用方（modules/graph）只依赖本签名，不感知具体适配器。
 */
export type ModelFactory = (modelId: string) => BaseChatModel

/**
 * 创建模型工厂。apiKey 在调用时从给定环境读取（缺 key 抛可读错误，
 * 阻断生成而非静默失败）；当前唯一供应商为 DeepSeek（ChatDeepSeek
 * 默认端点即官方 baseUrl，见注册表记录）。
 */
export function createModelFactory(env: NodeJS.ProcessEnv = process.env): ModelFactory {
  return (modelId) => {
    const target = findModelProvider(modelId)
    if (!target) {
      throw new Error(`未知模型 '${modelId}'：model-provider 注册表中无此条目`)
    }
    const apiKey = env[target.provider.apiKeyEnv]
    if (!apiKey) {
      throw new Error(
        `缺少环境变量 ${target.provider.apiKeyEnv}（供应商 ${target.provider.id}），无法创建模型 '${modelId}'`,
      )
    }
    return new ChatDeepSeek({ apiKey, model: target.model })
  }
}
