/**
 * 全局认证守卫。
 *
 * - 未登录访问受保护页面 -> 跳转 /auth
 * - 已登录访问 /auth -> 跳转 /dashboard
 *
 * 用 supabase.auth.getSession() 判断登录态（替代手读 localStorage）。
 * TODO: 主进程 IPC（safeStorage）storage 通道实现后，改为经 window.desktop 查询 session。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabase()
  // getSession 失败（如 storage/IPC 异常）视为未登录，避免守卫抛错把导航打回错误页造成死循环
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
  const loggedIn = !!data.session
  const isAuthPage = to.path.startsWith('/auth')

  // 已登录访问登录页 -> dashboard
  if (loggedIn && isAuthPage) {
    return navigateTo('/dashboard')
  }
  // 未登录访问受保护页面 -> 登录页
  if (!loggedIn && !isAuthPage) {
    return navigateTo('/auth')
  }
})
