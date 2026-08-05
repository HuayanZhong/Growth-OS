---
alwaysApply: false
description: Nuxt 测试环境规则（@nuxt/test-utils）：mockNuxtImport 必须从 @nuxt/test-utils/runtime 导入（主入口含 bun:test 无法打包）；需要真实 runtimeConfig 时用 env + vi.resetModules() 动态 import。使用 mockNuxtImport、处理模块单例时使用。
---

# Nuxt 测试环境

**适用场景**：测试里 mock composable（useRuntimeConfig 等）、重置模块级单例。

**要点**：

1. `mockNuxtImport` 一律从 `@nuxt/test-utils/runtime` 导入。从 `@nuxt/test-utils` 主入口导入会触发 e2e 模块（内含 `bun:test` 依赖），Vite 无法打包，导致整个套件 Failed Suites。
2. 需要真实值时（如 `useRuntimeConfig` 从 env 注入的 Supabase 配置）不 mock：`vi.resetModules()` + 动态 `import()` 重置模块缓存后再取函数，保证单例在可控状态下初始化。
3. `mockNuxtImport` 声明须在被 mock 模块的 `import` 之前（`.oxlintrc.json` 已对 `test/**` 豁免 `import/first`，不要为它调整源码顺序）。
4. 环境变量由 vitest.config.ts 启动时自动从根 `.env` 注入（见 [commands.md](commands.md)），测试内不要手动设置 `NUXT_PUBLIC_*`。

**示例**：

```ts
// 错误：从主入口导入会触发 e2e 模块
import { mockNuxtImport } from '@nuxt/test-utils'
// 正确
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
```

```ts
// 需要真实 runtimeConfig：不用 mockNuxtImport，重置模块缓存后动态导入
vi.resetModules()
const { useSupabase } = await import('~/composables/useSupabase')
```

**验证**：

```bash
pnpm test
# 无 "Failed Suites"；导入路径写错会在 Vite 打包阶段立即失败
```
