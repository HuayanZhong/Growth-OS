---
alwaysApply: false
description: 前端测试组织规则（Vitest + @nuxt/test-utils）：test/unit 放纯逻辑单测、test/nuxt 放组件/守卫/页面集测，文件与被测模块同名 kebab-case。新增测试文件、判断测试归属目录时使用。
---

# 测试目录结构

**适用场景**：新增测试文件、判断某个测试该放哪个目录。

**要点**：

1. 测试按两级目录划分：
   - `test/unit/`：纯逻辑单测（composables、工具函数、service）。不挂载组件、不需要 Nuxt 页面上下文，仅断言函数输入输出。
   - `test/nuxt/`：集成测试（组件挂载、路由守卫、页面、布局、error page）。依赖 Nuxt 运行时上下文（auto-import、useRouter 等）。
2. 文件命名 kebab-case + `.test.ts`，与被测模块同名：`useAuth.ts` → `use-auth.test.ts`；守卫 `auth.global.ts` → `auth-middleware.test.ts`（描述被测行为）。
3. 测试文件只放 `test/` 下，不与被测源码混放；同模块补测试直接改同名文件，不新建变体。
4. 配置统一在 `apps/desktop/vitest.config.ts`（`include: ['test/**/*.test.ts']` + Nuxt 测试环境），子模块不各自散配。

**示例**：

```text
apps/desktop/test/
├── unit/                       # 纯逻辑单测
│   ├── use-auth.test.ts
│   ├── use-secure-storage.test.ts
│   ├── use-supabase.test.ts
│   └── use-toast.test.ts
└── nuxt/                       # 集测：组件/守卫/页面/布局
    ├── auth-middleware.test.ts
    ├── error-page.test.ts
    ├── index-redirect.test.ts
    └── default-layout.test.ts
```

**验证**：

```bash
ls apps/desktop/test/unit apps/desktop/test/nuxt
# 每个新增 composable/关键模块在对应目录有同名 *.test.ts
```
