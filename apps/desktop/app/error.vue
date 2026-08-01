<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Nuxt 全局错误页。
 *
 * 应用运行时抛出未捕获错误时由 Nuxt 自动加载，作为整屏兜底界面。
 * 布局：hero 居中容器 + card 包裹错误信息，status 为视觉锚点。
 */
const props = defineProps<{ error: NuxtError }>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div class="hero-content">
      <div class="card card-border w-full max-w-md bg-base-100">
        <div class="card-body items-center gap-6 text-center">
          <h1 class="text-8xl font-bold leading-none text-error">
            {{ props.error?.status }}
          </h1>
          <p class="text-base text-base-content/70">
            {{ props.error?.message || '页面加载时出现问题' }}
          </p>
          <div class="card-actions">
            <button class="btn btn-primary" @click="handleError">返回首页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
