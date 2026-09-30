import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatDeepSeek } from '@langchain/deepseek'
import { createModelFactory } from '../../../src/modules/model-provider/factory.ts'
import { DEEPSEEK_PROVIDER } from '../../../src/modules/model-provider/registry.ts'

/**
 * 模型工厂：注册表定位 + 环境读取 + 适配器实例化（ChatDeepSeek mock，
 * 不真调外部服务）。缺 key / 未知模型两条失败分支必须抛可读错误。
 */
vi.mock('@langchain/deepseek', () => ({
  ChatDeepSeek: vi.fn(function (this: unknown) {
    return { _fake: 'chat-model' }
  }),
}))

const ChatDeepSeekMock = vi.mocked(ChatDeepSeek)

describe('createModelFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('注册表命中的模型 id 实例化 ChatDeepSeek 并注入 apiKey', () => {
    const factory = createModelFactory({ DEEPSEEK_API_KEY: 'sk-test' })

    const model = factory(DEEPSEEK_PROVIDER.defaultModel)

    expect(ChatDeepSeekMock).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      model: DEEPSEEK_PROVIDER.defaultModel,
    })
    expect(model).toEqual({ _fake: 'chat-model' })
  })

  it('注册表内的非默认模型同样可实例化', () => {
    const factory = createModelFactory({ DEEPSEEK_API_KEY: 'sk-test' })

    factory(DEEPSEEK_PROVIDER.models[1]!.id)

    expect(ChatDeepSeekMock).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      model: DEEPSEEK_PROVIDER.models[1]!.id,
    })
  })

  it('缺少 apiKey 环境变量时抛可读错误', () => {
    const factory = createModelFactory({})

    expect(() => factory(DEEPSEEK_PROVIDER.defaultModel)).toThrowError(
      new RegExp(DEEPSEEK_PROVIDER.apiKeyEnv),
    )
    expect(ChatDeepSeekMock).not.toHaveBeenCalled()
  })

  it('注册表未收录的模型 id 抛可读错误', () => {
    const factory = createModelFactory({ DEEPSEEK_API_KEY: 'sk-test' })

    expect(() => factory('gpt-99')).toThrowError(/未知模型/)
    expect(ChatDeepSeekMock).not.toHaveBeenCalled()
  })
})
