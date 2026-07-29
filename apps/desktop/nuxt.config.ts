import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  // 兼容性日期，用于 Nuxt 3.0 之前的版本
  compatibilityDate: '2026-07-29',

  // 禁用 SSR，因为桌面端不需要服务器端渲染
  ssr: false,

  // Electron 桌面端模块——自动编译 main/preload 并启动 Electron
  modules: ['./modules/electron'],
})
