import { defineConfig, devices } from '@playwright/test'

// 桌面端 E2E：web 模式主链路（真实浏览器 + 真实 Supabase 账号）+ Electron 生产构建冒烟。
// 设计决策见 openspec/changes/add-playwright-e2e/design.md（D1-D6）：
// - Chromium only（D4）：不要求 firefox/webkit 二进制
// - webServer 自动拉起 nuxt dev（固定 3000 端口，见 apps/desktop dev 脚本），已有 server 时复用（D2）
// - Electron 冒烟走生产构建产物 dist/main.js（D3），测试内经 _electron.launch 启动
// - 凭据经 test:e2e 脚本的 dotenv 链注入 process.env，缺失时用例级 skip（D5）
export default defineConfig({
  testDir: './test/e2e',
  // 用例间存在登录态依赖（登录→登出），串行执行避免互踩
  workers: 1,
  fullyParallel: false,
  // 登录链路依赖 Supabase 云端往返，放宽单用例与断言超时
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // trace/截图关闭：报告不落盘页面快照，规避测试账号凭据进入 git 跟踪文件（spec: 凭据不落盘）
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Windows 下 Nuxt 冷启动可能较慢（端口固定后健康检查路径确定）
    timeout: 180_000,
  },
})
