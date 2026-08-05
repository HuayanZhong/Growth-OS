---
alwaysApply: false
description: 测试断言与类型安全规则（Vitest + TS strict）：noUncheckedIndexedAccess 下数组索引加非空断言 !；跨层类型用显式断言；禁止 any；新增/修改测试后 typecheck 必须通过。修复 TS2322/TS2532/TS2554、写断言时使用。
---

# 断言与类型安全

**适用场景**：写断言；IDE/typecheck 报 TS2322（类型不兼容）、TS2532（可能 undefined）、TS2554（参数数量）等。

**要点**：

1. 项目开启 `noUncheckedIndexedAccess`：数组/元组索引访问可能为 `undefined`，取元素用非空断言：`toasts.value[0]!.id`、`mock.calls[0]![0].value`。
2. 类型不兼容时用显式断言，不用 `any` 与 `as unknown as` 链：
   - 守卫双参数调用：`authMiddleware(to as never, {} as never)`
   - NuxtError 断言：`error as NuxtError`、`Partial<NuxtError>`
3. 断言语义化：异步用 `resolves/rejects`（`await expect(...).resolves.toBeNull()`），mock 入参用 `toHaveBeenCalledWith(expect.not.stringContaining(...))`，优先于裸 `toBeTruthy`。
4. 一个用例的多个断言用 `toEqual`/`toMatchObject` 聚合，失败信息便于定位，不用散落多个小断言。

**示例**：

```ts
const sent = secureStoreMock.mock.calls[0]![0].value
expect(JSON.parse(sent).user).toEqual({ id: 'u1', email: 'a@b.com' })
```

**验证**：

```bash
pnpm typecheck   # 新增/修改测试后必须通过
```
