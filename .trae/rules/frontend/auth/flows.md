---
alwaysApply: false
description: 认证流程规则（Supabase Auth + Nuxt 4）：登录错误用 mapAuthError 转中文；注册（Confirm email 开启）session 为 null 显示确认视图；退出登录 session 过期/不存在禁止请求服务端 logout，用 signOut({ scope: 'local' })；session_not_found（403）降级本地退出；失败提示信息取自接口返回，成功文案自定义。编写登录、注册、退出流程时使用。
---

# 认证流程（登录 / 注册 / 退出）

**适用场景**：编写或修改登录、注册、退出登录逻辑。

## 登录

**要点**：

1. `signIn(email, password)`；错误统一 `mapAuthError(error)` 转中文文案展示。
2. 提交时强制字段级校验（zod），校验失败不请求；提交中禁用按钮防重复。

## 注册

**要点**：

1. Confirm email 开启：`signUp` 返回 `data.session === null` → 显示"确认邮件已发送"视图，用 `resendConfirmation(email)` 重发。
2. 若 session 非空（Confirm email 关闭）→ 直接跳转工作台。
3. 网络/服务端异常时 `signUp` 可能 throw（如 `AuthRetryableFetchError`），需 catch 兜底提示，避免静默失败。

## 退出登录：session 过期/不存在禁止请求服务端 logout

**要点**：

1. 退出前先 `getSession()`：session 为 null 或 `expires_at` 已过（`Date.now() / 1000 >= session.expires_at`）→ 直接 `signOut({ scope: 'local' })`，**不请求服务端**——服务端 session 已失效，请求必 403。
2. session 有效才调 `signOut()`；返回 `session_not_found`（403）或网络异常 → 降级 `signOut({ scope: 'local' })` 清本地，不抛错。
3. `signOutWithFallback` 统一封装三路兜底（无 session/过期、接口 error、网络异常），返回 `{ errorMessage?: string }`；UI 失败提示信息取自接口返回（`mapAuthError`），成功文案自定义（toast 类型：失败 warning、成功 success）。
4. 根因提醒：session 磁盘持久化（Electron 经 secureStorage 加密落盘，跨重启残留）导致 token 过期但本地仍显示"已登录"，退出必 403——桌面端高发场景。token 持久化与判定细节见 [token.md](token.md)。

**示例**：

```ts
signOutWithFallback = async (): Promise<{ errorMessage?: string }> => {
  const { data } = await this.supabase.auth.getSession();
  const session = data.session;
  if (!session || (session.expires_at != null && Date.now() / 1000 >= session.expires_at)) {
    await this.forceSignOut();
    return { errorMessage: "会话已过期或不存在" };
  }
  try {
    const { error } = await this.signOut();
    if (error) {
      await this.forceSignOut();
      return { errorMessage: mapAuthError(error) };
    }
    return {};
  } catch (err) {
    await this.forceSignOut();
    return { errorMessage: err instanceof Error ? err.message : "网络异常，本地会话已清除" };
  }
};
```

**验证**：

1. 测试覆盖分支：无 session / 过期 / 有效 / 403 降级 / 网络异常（见 `apps/desktop/test/unit/use-auth.test.ts`）。
2. `pnpm --filter desktop test`、`pnpm --filter desktop typecheck`、`pnpm --filter desktop lint` 全绿。
