/**
 * 全局认证守卫。
 *
 * - 未登录（或本地会话已过期）访问受保护页面 -> 跳转 /auth
 * - 已登录访问 /auth -> 跳转 DEFAULT_ENTRY（登录后默认入口）
 *
 * 用 supabase.auth.getSession() 判断登录态：client 已注入 secureStorage 加密通道
 * （Electron 经主进程 safeStorage，浏览器 fallback localStorage），无需手读 localStorage。
 * 过期判定只做本地 expires_at 比较（零网络请求）：磁盘持久化会话在 token 过期后
 * 仍能通过 getSession 存在，不预检会放进僵尸会话；运行中过期由 apiFetch 的 401
 * 统一出口兜底（刷新重试 → 登出回登录页）。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabase()
  // getSession 失败（如 storage/IPC 异常）视为未登录，避免守卫抛错把导航打回错误页造成死循环
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  const session = data.session
  // 本地过期预检：磁盘持久化（secureStorage）的过期会话视同未登录，快速拦截"侧边栏
  // 已登录但 token 已死"的僵尸会话；与 useAuth.signOutWithFallback 同一比较式。
  // 守卫零网络请求、不主动登出——token 新鲜度由 apiFetch 的 401 统一出口兜底
  const loggedIn =
    !!session && !(session.expires_at != null && Date.now() / 1000 >= session.expires_at)
  const isAuthPage = to.path.startsWith('/auth')

  // 已登录访问登录页 -> 登录后默认入口
  if (loggedIn && isAuthPage) {
    return navigateTo(DEFAULT_ENTRY)
  }
  // 未登录（含本地已过期）访问受保护页面 -> 登录页
  if (!loggedIn && !isAuthPage) {
    return navigateTo('/auth')
  }
})
