---
alwaysApply: false
description: 前端 token/session 管理规则（supabase-js + secureStorage）：不手读/手写 token，supabase-js 自动注入 Authorization 与自动刷新；session 存储走 secureStorage（Electron 加密 / 浏览器 fallback），持久化前剥离 PII；IPC/storage 异常降级不阻断；getSession 失败视为未登录防守卫死循环。处理 token 存储、登录态判定时使用。
---

# 前端 Token / Session 管理

**适用场景**：session 读写、登录态判定、token 安全持久化。

**要点**：

1. **不手读/手写 token**：supabase-js 自动把 access_token 注入请求头、`autoRefreshToken` 自动刷新；业务代码只经 `auth.getSession()` 读 session、`auth.signOut()` 登出。禁止手动拼 `Authorization` 头、禁止手动写/删 localStorage 里的 token key。
2. **session 存储走 secureStorage adapter**（`useSecureStorage.ts`）：
   - Electron：经 `window.desktop.secureStore` IPC 由主进程 safeStorage（OS 级加密）落盘，localStorage 不出现明文 token。
   - 纯浏览器（web 预览/测试，无 Electron preload）：fallback localStorage。
3. **持久化前剥离 PII**：setItem 前经 `trimSession` 裁剪，磁盘只留 token 字段 + 最小 user（id/email/avatar_url），不落 identities/app_metadata 等全量 PII。
4. **IPC/storage 异常降级**：
   - getItem 失败返回 null → 视为未登录，不阻断应用。
   - setItem 失败不阻断登录（内存 session 仍有效，仅重启后需重新登录）；auth-js 的 storage 异常会 throw 冒泡，必须 catch 兜住。
5. **明文残留一次性清理**：创建 client 前 `clearLegacyLocalStorageSession`——仅 Electron 环境清理历史明文 key（`supabase.auth.token`、`sb-<ref>-auth-token` 等），纯浏览器不执行，避免误删当前会话。
6. **client 配置固定四项**：`persistSession: true`、`autoRefreshToken: true`、`detectSessionInUrl: true`、`storage: secureStorage`（见 `useSupabase.ts`）。
7. **登录态判定统一 getSession**：守卫/页面用 `supabase.auth.getSession()`（client 已注入 secureStorage，无需手读 localStorage）；getSession 失败（storage/IPC 异常）视为未登录，避免守卫抛错把导航打回错误页造成死循环（见 `middleware/auth.global.ts`）。
8. **过期判定**：`session.expires_at`（秒级 epoch）与 `Date.now() / 1000` 比较；过期视为未登录，退出不请求服务端（见 [flows.md](flows.md)）。

**示例**：

```ts
client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: secureStorage,
  },
});
```

```ts
// 守卫：getSession 失败视为未登录，避免异常导致导航死循环
const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
const loggedIn = !!data.session;
```

**验证**：

1. `rg -n 'localStorage\.(setItem|getItem|removeItem)|Authorization' apps/desktop/app` 只命中 secureStorage/useSupabase 相关位置，业务代码无手写 token 读写。
2. 单测覆盖（`apps/desktop/test/unit/use-secure-storage.test.ts`）：trimSession PII 裁剪、浏览器 fallback、Electron IPC 分支、IPC 异常降级。
3. `pnpm --filter desktop test`、`pnpm --filter desktop typecheck`、`pnpm --filter desktop lint` 全绿。
