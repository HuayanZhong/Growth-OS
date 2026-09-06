# Cookbook：加一个 LLM 适配器

如何把新的 LLM 供应商（DeepSeek、OpenAI 兼容网关等）接进 `LLMAdapter` 契约。调用方只依赖接口——换供应商只动注册。

## 0. 先读契约

- 契约：[packages/types/src/adapters/llm.ts](../../packages/types/src/adapters/llm.ts)。`chat()` 必选；`stream?()` 是可选 `AsyncGenerator`——未实现时调用方回退到 `chat`。
- `LLMMessage` 就是会话投影的 `Message`（同一类型别名）。`deriveMessages` 的投影可直接传入 `chat`——无需转换。
- `LLMChatParams.signal` 承载聊天 UI 的停止按钮；把它传给底层 HTTP 调用。
- 实现落点：`apps/server/src/infra/adapters/llm/`——每个供应商一个文件，旁边放共享 DI token。（阶段四迁到插件接口之后；在那之前这就是落点。）
- 测试不得触达真实供应商——见[后端测试 mock 规则](../../.trae/rules/server/tests/mock.md)。

## 1. 实现适配器

创建 `apps/server/src/infra/adapters/llm/deepseek.ts`（原生 `fetch`，不加依赖）：

```ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { LLMAdapter, LLMChatParams, LLMChatResponse } from '@growth-os/types'

@Injectable()
export class DeepseekAdapter implements LLMAdapter {
  constructor(private readonly config: ConfigService) {}

  async chat(params: LLMChatParams): Promise<LLMChatResponse> {
    const apiKey = this.config.get<string>('LLM_API_KEY')
    if (!apiKey) throw new Error('LLM_API_KEY is not set')
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      }),
      signal: params.signal,
    })
    if (!res.ok) throw new Error(`LLM request failed: ${res.status}`)
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>
      usage: { prompt_tokens: number; completion_tokens: number }
    }
    return {
      content: data.choices[0]?.message.content ?? '',
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    }
  }
}
```

验证：`pnpm --filter server typecheck`

## 2. 加 env key

扩展 [apps/server/src/config/env.validation.ts](../../apps/server/src/config/env.validation.ts) 的 schema——密钥只在服务端读，所以是普通可选 key：

```ts
// LLM 供应商凭证：域模块消费适配器前保持可选
LLM_API_KEY: envString().optional(),
LLM_BASE_URL: envUrlString().optional(),
```

然后更新生成目录和 `.env.example`（schema 注释与后者逐字段对应）：

```bash
pnpm generate:config
pnpm verify:docs   # 目录过期会 fail——这就是那道检查
```

## 3. 注册 provider

创建 `apps/server/src/infra/adapters/llm/llm.token.ts`：

```ts
/** 当前 LLM 适配器的 DI token；消费方 @Inject(LLM_ADAPTER)，永不 import 具体类 */
export const LLM_ADAPTER = Symbol('LLM_ADAPTER')
```

注册到消费方的 module `providers`（如 `agents.module.ts`），或由它 import 一个独立的 `llm.module.ts`：

```ts
providers: [{ provide: LLM_ADAPTER, useClass: DeepseekAdapter }]
```

验证：`pnpm --filter server typecheck`

## 4. 消费

注入 token，不注入具体类：

```ts
constructor(@Inject(LLM_ADAPTER) private readonly llm: LLMAdapter) {}

// 会话投影的模型可见历史直接传入
const reply = await this.llm.chat({ model: 'deepseek-chat', messages: projection })
```

## 5. 用 mock 测试

镜像源码路径：`apps/server/test/infra/adapters/llm/deepseek.test.ts`。stub 全局 `fetch`——绝不打真实 API；覆盖成功与非 2xx 两条路径：

```ts
const config = { get: vi.fn(() => 'test-key') } as unknown as ConfigService
const adapter = new DeepseekAdapter(config)

it('200 时返回 content 与 usage', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(
    JSON.stringify({ choices: [{ message: { content: 'hi' } }], usage: { prompt_tokens: 1, completion_tokens: 2 } }),
    { status: 200 },
  )))
  await expect(adapter.chat({ model: 'deepseek-chat', messages: [] })).resolves.toMatchObject({
    content: 'hi',
    usage: { promptTokens: 1, completionTokens: 2 },
  })
  vi.unstubAllGlobals()
})

it('非 2xx 时抛错', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
  await expect(adapter.chat({ model: 'm', messages: [] })).rejects.toThrow('LLM request failed: 401')
  vi.unstubAllGlobals()
})
```

验证：`pnpm --filter server test`

## 6. 交付前全套验证

```bash
pnpm --filter server test
pnpm --filter server typecheck
pnpm lint
pnpm verify:docs
```

前端直连（composable 工厂替代 NestJS provider）走同一契约：DI 那步换成 composable 里的工厂，mock 目标换成模块的 `fetch`——其余完全一致。
