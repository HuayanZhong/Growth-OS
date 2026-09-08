import { ConfigService } from '@nestjs/config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeepseekAdapter } from '../../../../src/infra/adapters/llm/deepseek.ts'

/**
 * DeepSeek/OpenAI 兼容适配器：stub 全局 fetch，绝不触真实 API
 * （server tests mock 规则）。覆盖 chat 成功/失败/缺 key、消息映射、SSE 流式。
 */
describe('DeepseekAdapter', () => {
  function makeAdapter(baseUrl?: string): DeepseekAdapter {
    const config = {
      get: (key: string) => (key === 'LLM_API_KEY' ? 'test-key' : baseUrl),
    } as unknown as ConfigService
    return new DeepseekAdapter(config)
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const completion = (content: string) =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 1, completion_tokens: 2 },
      }),
      { status: 200 },
    )

  it('chat：200 返回 content 与 usage（camelCase 映射）', async () => {
    const fetchMock = vi.fn<(url?: unknown, init?: unknown) => Promise<Response>>(async () =>
      completion('hi'),
    )
    vi.stubGlobal('fetch', fetchMock)
    const adapter = makeAdapter()

    await expect(
      adapter.chat({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'hello' }] }),
    ).resolves.toMatchObject({
      content: 'hi',
      usage: { promptTokens: 1, completionTokens: 2 },
    })
    // 请求打到 OpenAI 兼容端点，鉴权头携带 API key
    const firstCall = fetchMock.mock.calls[0]
    expect(firstCall?.[0]).toBe('https://api.deepseek.com/chat/completions')
    const init = firstCall?.[1] as { headers: Record<string, string> }
    expect(init.headers.authorization).toBe('Bearer test-key')
  })

  it('chat：LLM_BASE_URL 覆盖请求基址', async () => {
    const fetchMock = vi.fn<(url?: unknown, init?: unknown) => Promise<Response>>(async () =>
      completion('hi'),
    )
    vi.stubGlobal('fetch', fetchMock)
    await makeAdapter('https://gateway.internal/v1').chat({
      model: 'm',
      messages: [{ role: 'user', content: 'x' }],
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://gateway.internal/v1/chat/completions')
  })

  it('chat：非 2xx 抛 LLM request failed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 401 })),
    )
    await expect(
      makeAdapter().chat({ model: 'm', messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toThrow('LLM request failed: 401')
  })

  it('缺 LLM_API_KEY 时调用即抛错，不发起请求', async () => {
    const config = { get: () => undefined } as unknown as ConfigService
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(new DeepseekAdapter(config).chat({ model: 'm', messages: [] })).rejects.toThrow(
      'LLM_API_KEY is not set',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('消息映射：tool 角色带 tool_call_id，assistant 携带 tool_calls', async () => {
    const fetchMock = vi.fn<(url?: unknown, init?: unknown) => Promise<Response>>(async () =>
      completion('ok'),
    )
    vi.stubGlobal('fetch', fetchMock)
    await makeAdapter().chat({
      model: 'm',
      messages: [
        { role: 'system', content: 'sys' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'c1', name: 'get_time', arguments: '{}' }],
        },
        { role: 'tool', content: '12:00', toolCallId: 'c1' },
      ],
    })
    const init = fetchMock.mock.calls[0]?.[1] as { body: string }
    const body = JSON.parse(init.body) as { messages: Array<Record<string, unknown>> }
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'get_time', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'c1', content: '12:00' },
    ])
  })

  it('stream：解析 SSE 增量，[DONE] 结束', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":"好"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(sse))
                controller.close()
              },
            }),
            { status: 200 },
          ),
      ),
    )

    const chunks: string[] = []
    for await (const chunk of makeAdapter().stream({
      model: 'm',
      messages: [{ role: 'user', content: 'hi' }],
    })) {
      chunks.push(chunk.content)
    }
    expect(chunks.join('')).toBe('你好')
  })

  it('stream：非 2xx 抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    )
    await expect(
      makeAdapter()
        .stream({ model: 'm', messages: [{ role: 'user', content: 'x' }] })
        .next(),
    ).rejects.toThrow('LLM request failed: 500')
  })
})
