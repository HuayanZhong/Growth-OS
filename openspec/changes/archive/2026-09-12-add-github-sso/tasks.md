# Tasks: add-github-sso

## 1. 外部配置（手工前置，非代码）

- [x] 1.1 创建 GitHub OAuth App（Homepage URL = `NUXT_PUBLIC_SITE_URL`，Callback URL = `https://<project-ref>.supabase.co/auth/v1/callback`），保存 Client ID/Secret 到根 `.env`（不提交）。验证：OAuth App 出现在 GitHub → Settings → Developer settings → OAuth Apps 列表
- [x] 1.2 Supabase Dashboard 启用 GitHub provider（填入 Client ID/Secret），并在 URL Configuration → Redirect URLs 登记生产 siteUrl 与 dev 地址。验证：`curl -s "$NUXT_PUBLIC_SUPABASE_URL/auth/v1/settings"` 返回 JSON 中 `"github": true`（位于 external 字段）

## 2. PKCE 流程验证（design 风险 spike）

- [x] 2.1 `apps/desktop/app/composables/useSupabase.ts` 增加 `flowType: 'pkce'`，确认 `signInWithPassword` 等既有路径测试不受影响。验证：`pnpm --filter desktop test`
- [x] 2.2 本地 dev 手工验证 PKCE 链路前半段：调用 `signInWithOAuth({ provider: 'github', options: { skipBrowserRedirect: true } })` 返回的 URL 含 `code_challenge`，verifier 写入 secureStorage adapter。验证：dev 运行观察 + `pnpm --filter desktop test` 绿（若受阻，按 design.md D2 回退 implicit 并在 design.md 记录决定）

## 3. desktop-core OAuth 窗口通道

- [x] 3.1 `packages/types/src/utils/ipc-channels.ts`：`IpcChannelMap` 新增 `oauthWindow` 条目（request `{ authUrl, callbackOrigin }` → response `{ callbackUrl }`；错误经 reject 语义）。验证：`pnpm typecheck`
- [x] 3.2 `packages/desktop-core/ipc/oauth-window.ts`：实现次级 `BrowserWindow`（`sandbox: true`、`contextIsolation: true`、无 preload），`will-navigate`/`will-redirect` 按 `callbackOrigin` 前缀拦截并 resolve 回调 URL，用户关窗/超时/导航白名单外 reject；配套单测覆盖成功、用户取消、超时、非法导航（mock `BrowserWindow`，不启真实窗口）。验证：`pnpm --filter desktop-core test`（或 `pnpm test`）
- [x] 3.3 `packages/desktop-core/ipc/index.ts` 注册通道、`packages/desktop-core/preload/index.ts` 暴露方法（`window.desktop` 类型自动跟随）。验证：`pnpm typecheck && pnpm test`

## 4. 前端 GitHub 登录接线

- [x] 4.1 新增 `apps/desktop/app/assets/icons/github.svg`（GitHub 官方 mark）。验证：文件存在且 `pnpm dev` 登录页无资源加载报错
- [x] 4.2 新增 OAuth 登录 composable（如 `apps/desktop/app/composables/useOAuthSignIn.ts`）：`signInWithOAuth` → `window.desktop.oauthWindow(...)` → `exchangeCodeForSession` → 返回会话；失败抛出可本地化错误；配套单测（mock `window.desktop` 与 supabase client，覆盖成功/用户取消/交换失败，遵守 tests/mock 规则，不触真实服务）。验证：`pnpm --filter desktop vitest run test/nuxt/use-oauth-sign-in.test.ts`
- [x] 4.3 `apps/desktop/app/components/auth/login.vue`：微信按钮（L181-190）替换为 GitHub 按钮（中性配色 token，遵守 styles/colors 规则）；`onSso` 类型改为 `'qq' | 'github'`，GitHub 分支调用新 composable 并带 loading 防重入，成功后沿用既有 GSAP 离场 + `navigateTo('/dashboard/agents')`，失败 `mapAuthError` toast；QQ 分支保持 no-op。验证：`pnpm --filter desktop test && pnpm typecheck && pnpm lint`

## 5. 端到端验证与收尾

- [ ] 5.1 dev 冒烟（Electron 实跑）：GitHub 授权成功 → 进入 `/dashboard/agents`；重启应用会话保持；关窗/拒绝授权 → 中文错误提示且可重试；QQ 按钮点击无行为。验证：逐条人工核对 specs `auth-oauth-login` 的场景（浏览器分支已由 chrome-devtools 实测通过：授权成功进 dashboard、会话守卫放行、QQ 无行为、预检中文提示；**仅剩 Electron 真窗口内的 oauthWindow 分支点验**——打开 `pnpm dev` 的桌面窗口点一次 GitHub 登录 + 一次中途关窗即可）
- [x] 5.2 生产构建冒烟：确认打包后 OAuth 流程不因 file:// 加载受影响。验证：`pnpm --filter desktop verify:build`
- [x] 5.3 全量验证套件。验证：`pnpm test` → `pnpm typecheck` → `pnpm lint` → `pnpm verify` 全绿
- [x] 5.4 附 thin pointer Agent Note（`.agents/notes/`，按 OpenSpec change 契约：摘要 + 指向本 change）。验证：`pnpm verify:docs`
