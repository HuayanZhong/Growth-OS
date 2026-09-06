# Cookbook: add an LLM adapter

How to wire a new LLM provider (DeepSeek, an OpenAI-compatible gateway, ...) behind the `LLMAdapter` contract. Callers depend only on the interface — swapping providers touches registration only.

## 0. Read the contract first

- Contract: [packages/types/src/adapters/llm.ts](../../packages/types/src/adapters/llm.ts). `chat()` is required; `stream?()` is an optional `AsyncGenerator` — callers fall back to `chat` when it is absent.
- `LLMMessage` is the session projection's `Message` (same type alias). A projection built with `deriveMessages` passes straight into `chat` — no conversion.
- `LLMChatParams.signal` carries the chat UI's stop button; pass it to the underlying HTTP call.
- Implementation home: `apps/server/src/infra/adapters/llm/` — one file per provider, next to the shared DI token. (Phase 4 moves these behind a plugin interface; until then this is the home.)
- Tests must not reach the real provider — see [server test mock rules](../../.trae/rules/server/tests/mock.md).

## 1. Implement the adapter

Create `apps/server/src/infra/adapters/llm/deepseek.ts` (native `fetch`, no new dependency):

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

Verify: `pnpm --filter server typecheck`

## 2. Add the env keys

Extend the schema in [apps/server/src/config/env.validation.ts](../../apps/server/src/config/env.validation.ts) — secrets are read server-side only, so they are plain optional keys:

```ts
// LLM provider credentials: optional until a domain module consumes the adapter
LLM_API_KEY: envString().optional(),
LLM_BASE_URL: envUrlString().optional(),
```

Then update the generated catalog and `.env.example` (the schema comment links each field to it):

```bash
pnpm generate:config
pnpm verify:docs   # fails if the catalog is stale — this is the check
```

## 3. Register the provider

Create `apps/server/src/infra/adapters/llm/llm.token.ts`:

```ts
/** DI token for the active LLM adapter; consumers @Inject(LLM_ADAPTER), never a concrete class */
export const LLM_ADAPTER = Symbol('LLM_ADAPTER')
```

Register in the consuming module's `providers` (e.g. `agents.module.ts`) or a dedicated `llm.module.ts` imported by it:

```ts
providers: [{ provide: LLM_ADAPTER, useClass: DeepseekAdapter }]
```

Verify: `pnpm --filter server typecheck`

## 4. Consume it

Inject the token, never a concrete class:

```ts
constructor(@Inject(LLM_ADAPTER) private readonly llm: LLMAdapter) {}

// model-visible history from the session projection goes straight in
const reply = await this.llm.chat({ model: 'deepseek-chat', messages: projection })
```

## 5. Test with mocks

Mirror the source path: `apps/server/test/infra/adapters/llm/deepseek.test.ts`. Stub the global `fetch` — never hit the real API; cover the success path and the non-2xx path:

```ts
const config = { get: vi.fn(() => 'test-key') } as unknown as ConfigService
const adapter = new DeepseekAdapter(config)

it('returns content and usage on 200', async () => {
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

it('throws on non-2xx', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })))
  await expect(adapter.chat({ model: 'm', messages: [] })).rejects.toThrow('LLM request failed: 401')
  vi.unstubAllGlobals()
})
```

Verify: `pnpm --filter server test`

## 6. Full verification before shipping

```bash
pnpm --filter server test
pnpm --filter server typecheck
pnpm lint
pnpm verify:docs
```

Frontend direct calls (composable factory instead of a NestJS provider) follow the same contract; the DI step becomes a factory in a composable and the mock target becomes the module's `fetch` — everything else is identical.
