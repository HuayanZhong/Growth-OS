---
alwaysApply: false
description: 可复用样式抽取规则（Vue 3 + shadcn 风格）：重复 3 次以上的类组合抽取为 UI 包组件，变体用 cva，类名合并经 cn() 保证外部可覆盖。抽取 UI 基础组件、定义组件变体时使用。
---

# 可复用样式抽取

**适用场景**：同类 class 出现 3 次以上；组件需要多形态且对外可覆盖。

**要点**：

1. 抽取到 UI 包 `src/components/ui/<name>/`（组件 + index.ts），barrel 统一导出。
2. 类名合并统一走 `cn()`（`twMerge(clsx(...))`），外部 `class` 经 `cn(base, props.class)` 合并，保证可覆盖。
3. 变体用 cva 定义，`xxxVariants` 函数与类型随组件导出。
4. 依赖 Vue attribute fallthrough 透传 class；非根节点透传时处理 `$attrs.class`。

**示例**：

```ts
// index.ts
export const buttonVariants = cva('btn', {
  variants: {
    variant: { default: 'btn-primary', outline: 'btn-outline', ghost: 'btn-ghost' },
    size: { default: '', sm: 'btn-sm', lg: 'btn-lg' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})
```

```vue
<!-- Button.vue -->
<button type="button" :class="cn(buttonVariants({ variant, size }), props.class)">
  <slot />
</button>
```

**验证**：

1. `cn()` 合并后外部覆盖类生效（传入 `class="w-full"` 覆盖默认宽度类）。
2. UI 包 typecheck 通过。
3. 页面上重复的同类 class 已替换为组件引用。
