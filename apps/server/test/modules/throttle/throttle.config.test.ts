import { describe, it, expect, vi } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { createThrottlerOptions } from '../../../src/modules/throttle/throttle.config.ts'

describe('createThrottlerOptions', () => {
  it('环境变量未配置时返回缺省值：60s / 100 次', () => {
    const config = { get: vi.fn().mockReturnValue(undefined) } as unknown as ConfigService
    const result = createThrottlerOptions(config)

    expect(result).toEqual([{ ttl: 60_000, limit: 100 }])
  })

  it('环境变量覆盖 TTL 和限额', () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'THROTTLE_TTL_MS') return 30_000
        if (key === 'THROTTLE_LIMIT') return 50
        return undefined
      }),
    } as unknown as ConfigService
    const result = createThrottlerOptions(config)

    expect(result).toEqual([{ ttl: 30_000, limit: 50 }])
  })
})
