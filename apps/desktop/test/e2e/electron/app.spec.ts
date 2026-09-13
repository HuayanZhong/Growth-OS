// Electron 冒烟：启动生产构建产物（loadFile 路径，非 dev server），验证应用可启动、
// 主窗口创建、认证页在窗口内渲染。前置条件：pnpm build 已产出 dist/main.js（缺失时明确失败，
// 不静默 skip——spec: 冒烟只消费生产构建产物）
import { execSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

const MAIN_JS = resolve(process.cwd(), '../../packages/desktop-core/dist/main.js')

// 独立 userData（bootstrap 支持 ELECTRON_USER_DATA_DIR）：隔离用户日常 file:// origin
// 的真实登录态——既避免冒烟自动登录跳过认证页，也避免冒烟清掉用户会话
const USER_DATA_DIR = resolve(tmpdir(), 'growth-os-e2e-electron-smoke')

test.describe('Electron 生产构建冒烟', () => {
  let electronApp: ElectronApplication | null = null

  test.afterEach(async () => {
    // Windows 下 _electron 的进程树收割不保证完全，taskkill /T 兜底（backlog 已知摩擦模式）
    const pid = electronApp?.process()?.pid
    if (electronApp) {
      await electronApp.close().catch(() => {})
    }
    if (pid) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
      } catch {
        // 进程已自然退出
      }
    }
    electronApp = null
  })

  test('生产构建产物可启动并在窗口内渲染认证页', async () => {
    // 明确失败而非静默 skip：产物缺失说明前置构建步骤未执行
    expect(
      existsSync(MAIN_JS),
      `production build missing at ${MAIN_JS} — run \`pnpm build\` first`,
    ).toBe(true)
    // 干净会话起点：每次冒烟清空隔离 userData（冒烟不写会话，残留只会来自异常中断）
    rmSync(USER_DATA_DIR, { recursive: true, force: true })

    // VITE_DEV_SERVER_URL 置空强制走 loadFile 生产加载路径（bootstrap/window.ts 的分支依据）
    electronApp = await _electron.launch({
      args: [MAIN_JS, '--no-sandbox'],
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: '',
        ELECTRON_USER_DATA_DIR: USER_DATA_DIR,
      },
    })
    const window: Page = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    // 主窗口加载的是应用自身资源（file:// 生产路径），未外跳系统浏览器
    expect(window.url().startsWith('file://')).toBe(true)

    // 认证页在窗口内完成渲染（无会话时 auth guard 停留在 /auth）
    await expect(window.locator('form input[name="email"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(window.locator('button[type="submit"]')).toBeVisible()
  })
})
