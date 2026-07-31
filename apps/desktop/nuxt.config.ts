import { defineNuxtConfig } from 'nuxt/config';
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  // 兼容性日期，用于 Nuxt 3.0 之前的版本
  compatibilityDate: '2026-07-29',

  // 禁用 SSR，因为桌面端不需要服务器端渲染
  ssr: false,

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

  // 启用 Nuxt DevTools
  devtools: { enabled: true },
});
