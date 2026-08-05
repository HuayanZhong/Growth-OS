---
alwaysApply: false
description: 测试隔离规则（Vitest）：beforeEach 重置共享状态（localStorage、模块单例、mock），定时器用 vi.useFakeTimers 推进并 afterEach 还原；用例之间不互相依赖。编写有状态或异步（定时器）测试时使用。
---

# 测试隔离

**适用场景**：测试涉及模块级单例、localStorage、setTimeout、mock 函数。

**要点**：

1. 模块级单例（client、全局 toasts 等）在 `beforeEach` 重置：`toasts.value = []`、`localStorage.clear()`；浏览器全局（如 `window.desktop`）增删后要在用例内恢复或清理，避免污染后续用例。
2. 定时器一律 `vi.useFakeTimers()`，用 `vi.advanceTimersByTime()` 推进，禁止真实 `sleep`；`afterEach` 中 `vi.useRealTimers()` 还原。
3. mock 函数在 `beforeEach` 里重建（`vi.fn()`），spy 在 `afterEach` 里 `vi.restoreAllMocks()` 清理，避免跨用例泄漏。
4. 每个用例自给自足：不依赖上一个用例留下的状态，也不假设执行顺序。
5. `vi.resetModules()` 只影响模块缓存，不清理真实副作用（localStorage、定时器）——两者分开处理。

**示例**：

```ts
beforeEach(() => {
  toasts.value = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});
```

**验证**：

```bash
# 同一文件单独跑与全量跑结果一致（隔离不依赖顺序）
pnpm vitest run test/unit/use-toast.test.ts
```
