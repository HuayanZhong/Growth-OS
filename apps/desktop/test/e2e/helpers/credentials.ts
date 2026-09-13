// E2E 凭据注入（design D5）：仅从环境变量读取真实 Supabase 测试账号，绝不硬编码；
// 值不进入日志、报告或任何 git 跟踪文件（spec: 凭据不落盘）
import { test } from '@playwright/test'

// re-export 保证用例文件与本 helper 的 skip 语义绑定在同一个 test 实例上
export { test }

export interface TestCredentials {
  email: string
  password: string
}

function readCredentials(): TestCredentials | null {
  const email = process.env.SUPABASE_TEST_EMAIL?.trim() ?? ''
  const password = process.env.SUPABASE_TEST_PASSWORD?.trim() ?? ''
  if (!email || !password) return null
  return { email, password }
}

// 在测试体内调用：凭据缺失时跳过当前用例（spec: 缺失自动 skip，整体退出码不受影响）
export function requireCredentials(): TestCredentials {
  const credentials = readCredentials()
  test.skip(!credentials, 'SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD not set')
  if (!credentials) {
    // test.skip 已中止本用例的后续断言；此处仅为类型收窄的可达性兜底
    throw new Error('unreachable: skipped by credential guard')
  }
  return credentials
}
