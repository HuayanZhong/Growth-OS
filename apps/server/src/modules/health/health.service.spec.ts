// jest.mock 必须在 import 之前（Jest hoisting 要求）
jest.mock('@mikro-orm/nestjs', () => ({
  InjectMikroORM: () => () => {},
}))

import { MikroORM } from '@mikro-orm/core'
import { HealthService } from './health.service.ts'

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
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
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
    jest.advanceTimersByTime(5_000)
    const result = await resultPromise

    expect(result.status).toBe('disconnected')
  })

  it('DB 查询成功时 timer 被清理，无泄漏', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const orm = createOrmMock(async () => [{ '?column?': 1 }])
    const service = new HealthService(orm)

    await service.checkDatabase()

    // 成功路径必须调用 clearTimeout 清理 timer
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
