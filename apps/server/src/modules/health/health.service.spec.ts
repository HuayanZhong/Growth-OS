// jest.mock 必须在 import 之前（Jest hoisting 要求），eslint-disable 抑制 import/first 警告
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
})
