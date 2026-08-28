// vi.mock 由 Vitest 提升到 import 之前（与 jest.mock 语义一致，且 Vitest 原生可加载 ESM 包）
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MikroORM } from '@mikro-orm/core'
import { HealthService } from './health.service.ts'

vi.mock('@mikro-orm/nestjs', () => ({
  InjectMikroORM: () => () => {},
}))

function createOrmMock(executeFn: () => Promise<unknown>) {
  return {
    em: {
      getConnection: () => ({
        execute: executeFn,
      }),
    },
  } as unknown as MikroORM
}

describe('HealthService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('DB 连通时返回 connected + 延迟', async () => {
    const orm = createOrmMock(async () => [{ '?column?': 1 }])
    const service = new HealthService(orm)

    const result = await service.checkDatabase()

    expect(result.status).toBe('connected')
    expect(typeof result.latencyMs).toBe('number')
  })

  it('DB 断开时返回 disconnected，不抛异常', async () => {
    const orm = createOrmMock(async () => {
      throw new Error('connection refused')
    })
    const service = new HealthService(orm)

    const result = await service.checkDatabase()

    expect(result.status).toBe('disconnected')
  })

  it('DB 查询超过 5s 超时返回 disconnected', async () => {
    // 模拟查询永远不返回（TCP 半开场景）
    const orm = createOrmMock(() => new Promise<never>(() => {}))
    const service = new HealthService(orm)

    const resultPromise = service.checkDatabase()
    // 快进 5s 触发超时
    vi.advanceTimersByTime(5_000)
    const result = await resultPromise

    expect(result.status).toBe('disconnected')
  })

  it('DB 查询成功时 timer 被清理，无泄漏', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const orm = createOrmMock(async () => [{ '?column?': 1 }])
    const service = new HealthService(orm)

    await service.checkDatabase()

    // 成功路径必须调用 clearTimeout 清理 timer
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
