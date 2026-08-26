import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'

// Electron 生产打包用 loadFile 加载 index.html，绝对路径 /_nuxt/ 会解析为文件系统根目录导致白屏
// Nuxt 官方文档：app.baseURL 在 nuxt.config.ts 中不支持相对路径（Nitro 限制），需通过环境变量设置
// https://nuxt.com/docs/4.x/api/nuxt-config#baseurl
// 从 .env 读取（根 package.json 的 build/dev 脚本通过 dotenv-cli 注入），兜底 './'
// dev 模式强制 '/':dev 下 Electron 窗口走 dev server URL 加载（见 modules/electron.ts），
// 相对 baseURL './' 会让子路由（如 /dashboard/agents）把静态资源相对解析成畸形绝对路径
// （Windows 盘符拼进 URL，服务端返回 HTML，MIME 校验失败 → 客户端入口加载失败、页面白屏）。
// 注意：不能只改 process.env——Nuxt 在加载 config 前就已解析 env 默认值，运行时再改无效，必须显式写进 app 配置。
const appBaseURL =
  process.env.NODE_ENV === 'production' ? process.env.NUXT_APP_BASE_URL || './' : '/'

export default defineNuxtConfig({
  // 兼容性日期，用于 Nuxt 3.0 之前的版本
  compatibilityDate: '2026-07-29',

  // 禁用 SSR，因为桌面端不需要服务器端渲染
  ssr: false,

  // 全局 head：CSP meta 消除 Electron 安全警告。
  // 注意：禁止加入 'unsafe-eval'（警告专门针对它）；'unsafe-inline' 是 Nuxt SPA
  // 内联 payload 所需，不会触发该警告。
  app: {
    baseURL: appBaseURL,
    head: {
      meta: [
        {
          'http-equiv': 'Content-Security-Policy',
          content: [
            "default-src 'self'",
            // Nuxt SPA 内联 payload 脚本 + 样式（Tailwind/daisyUI 注入）
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            // Supabase 头像/文件存储 + 内联图片
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' data:",
            // Supabase API（https）+ dev 模式 HMR（ws/localhost）
            "connect-src 'self' https: http: ws: wss:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  },

  // Electron 桌面端模块——自动编译 main/preload 并启动 Electron
  // @nuxt/test-utils/module 提供 Vitest 的 Nuxt 测试环境
  modules: ['./modules/electron', '@nuxt/test-utils/module'],

  // 配置 Tailwind CSS
  vite: {
    plugins: [tailwindcss()],
  },

  // 引入自定义 CSS 文件
  css: ['~/assets/css/main.css'],

  // 桌面端 SPA 构建，无需 Nitro 运行时
  nitro: {
    preset: 'static',
  },

  // 路由级布局：集中管理，无需在每个页面写 definePageMeta
  routeRules: {
    '/dashboard': { appLayout: 'dashboard' },
    '/dashboard/**': { appLayout: 'dashboard' },
  },

  // 运行时配置：public 区的变量会内联到前端 bundle，暴露给终端用户
  // 禁止把 secret（如 API Key）放进 public 区
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      appName: process.env.NUXT_PUBLIC_APP_NAME ?? 'Growth OS',
      // Supabase 公开配置（publishable key，非 secret，可暴露给前端）
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      // 自有后端 API 地址（useApi 请求基座），默认本地 dev 服务
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
    },
  },

  // 启用 Nuxt DevTools
  devtools: { enabled: true },

  // 扩展 Nuxt 生成的 tsconfig：默认 include 只覆盖 test/nuxt（集测目录），
  // unit（纯逻辑单测）不在其中，导致 IDE 无法解析 unit 文件里的 ~ 别名。
  // 路径基准与 .nuxt/tsconfig.app.json 的 include 一致（相对 .nuxt/ 目录）。
  typescript: {
    tsConfig: {
      include: ['../test/unit/**/*'],
    },
  },
})
