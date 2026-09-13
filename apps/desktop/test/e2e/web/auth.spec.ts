// web 模式主链路（真实浏览器加载 dev server）：登录 → 工作台 → 登出、无效凭据拒绝、
// 登录/注册翻转后表单可交互。断言页面级可观察结果，不断言动画中间帧（design Non-Goals）
import { expect } from '@playwright/test'
import { requireCredentials, test } from '../helpers/credentials'

// 认证页选择器对齐现有组件（login.vue / auth/index.vue / app-sidebar.vue）
const AUTH_URL = /\/auth/
const DASHBOARD_URL = /\/dashboard/

test.describe('web 主链路', () => {
  // 不依赖测试账号：任意格式合法的邮箱 + 错误密码即可触发 Supabase 拒绝
  test('无效凭据被拒绝且不进入工作台', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.locator('form input[name="email"]')).toBeVisible()
    await page.fill('form input[name="email"]', 'e2e-invalid@example.com')
    await page.fill('form input[name="password"]', 'wrong-password-123')
    await page.click('form button[type="submit"]')
    // Supabase 往返后出现错误 toast（mapAuthError → showToast）
    await expect(page.locator('.toast .alert-error')).toBeVisible()
    await expect(page).toHaveURL(AUTH_URL)
  })

  test('登录/注册表单双向切换后目标表单可交互', async ({ page }) => {
    await page.goto('/auth')
    const emailInput = page.locator('form input[name="email"]')
    await expect(emailInput).toBeVisible()

    // 登录 → 注册：fill 需要元素 stable + enabled，天然验证翻转动画结束后表单可用
    await page.click('.card .btn-link')
    await expect(emailInput).toBeVisible()
    await emailInput.fill('flip@example.com')

    // 注册 → 登录（GitHub 按钮是登录表单独有的结构标志）
    await page.click('.card .btn-link')
    await expect(page.locator('img[alt="GitHub logo"]')).toBeVisible()
    await emailInput.fill('flip-back@example.com')

    // 无遮挡残留：翻转结束态不产生横向滚动条
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('真实凭据登录进入工作台并登出回认证页', async ({ page }) => {
    const { email, password } = requireCredentials()

    await page.goto('/auth')
    await page.fill('form input[name="email"]', email)
    await page.fill('form input[name="password"]', password)
    await page.click('form button[type="submit"]')
    // 登录卡片离场动画结束后 navigateTo；Supabase 往返 + 动画，放宽到 30s
    await expect(page).toHaveURL(DASHBOARD_URL, { timeout: 30_000 })
    await expect(page.locator('aside')).toBeVisible()

    // 登出：侧边栏按钮 → daisyUI modal 确认（dashboard 有多个 modal，按文本锁定登出确认按钮）
    await page.click('button[title="退出登录"]')
    await page.click('dialog.modal .modal-action button:has-text("确认退出")')
    await expect(page).toHaveURL(AUTH_URL, { timeout: 30_000 })

    // 受保护路由被重定向回认证页（登出语义完整）
    await page.goto('/dashboard/agents')
    await expect(page).toHaveURL(AUTH_URL)
  })
})
