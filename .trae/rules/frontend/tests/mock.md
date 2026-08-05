---
alwaysApply: false
description: 测试 mock 策略（Vitest）：外部服务（Supabase 网络、Electron IPC）禁止真实调用，一律 mock/stub 并覆盖正常与异常路径；Electron/浏览器分支用 window.desktop 控制。mock 外部依赖、控制运行环境分支时使用。
---

# Mock 策略

**适用场景**：测试涉及网络请求、Electron IPC、浏览器 API 分支。

**要点**：

1. 外部服务禁止真实调用：Supabase 网络请求、Electron IPC（`window.desktop.secureStore`）全部 mock/stub；测试环境不依赖外网与真实登录。
2. Electron/浏览器分支用环境状态控制：`window.desktop` 存在与否决定 `isElectron()` 走向，直接增删该属性即可，不改源码逻辑（见 use-supabase 测试）。
3. IPC 三方法（getItem/setItem/removeItem）mock 时覆盖正常与异常（reject）两条路径：被测代码有异常兜底时，断言"不抛出且返回默认值"（如 `resolves.toBeNull()`）。
4. mock 的入参断言走 `toHaveBeenCalledWith({ action: 'set', key, value: expect.any(String) })`，不比对完整对象字面量。
5. 模块级单例需要重置时用 `vi.resetModules()` + 动态 import，不通过改源码导出实现。

**示例**：

```ts
secureStoreMock.mockRejectedValue(new Error("ipc down"));
await expect(secureStorage.getItem("k1")).resolves.toBeNull();
// 持久化失败不阻断调用方
await expect(secureStorage.setItem("k1", "v")).resolves.toBeUndefined();
```

**验证**：

```bash
# 测试目录内不应出现真实网络调用（无输出即通过；rg 无匹配时退出码为 1，属正常）
rg -n 'fetch\(|createClient\(' apps/desktop/test
```
