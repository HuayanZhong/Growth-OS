/**
 * 全局认证守卫。
 *
 * - 未登录访问受保护页面 → 跳转 /auth
 * - 已登录访问 /auth → 跳转首页
 *
 * 会话检测说明：supabase-js 的默认 storageKey 由 project ref 计算，
 * 格式为 `sb-<project-ref>-auth-token`（createClient 内部
 * `${baseUrl.hostname.split('.')[0]}` 命名空间，已查证源码）。
 * 接入前临时遍历该命名规则判断登录态。
 * TODO: 接入 supabase-js 后改用 supabase.auth.getSession() 判断，
 *       勿手读 storage（兼容显式 storageKey / 过期 / 多 key 场景）。
 * TODO: 主进程 IPC（safeStorage）storage 通道实现后，改为经 window.desktop 查询 session。
 */
function hasSession(): boolean {
  // SPA 场景 localStorage 始终可用；此处防御性判断，避免 SSR/非浏览器环境报错
  if (typeof localStorage === 'undefined') return false

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    // supabase-js 的 session key 命名规则：sb-<project-ref>-auth-token
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw && JSON.parse(raw).access_token) return true
    } catch {
      // 单个 key 损坏不影响整体判断，忽略继续
    }
  }
  return false
}

export default defineNuxtRouteMiddleware((to) => {
  const loggedIn = hasSession()
  const isAuthPage = to.path.startsWith('/auth')

  // 已登录访问登录页 → 首页
  if (loggedIn && isAuthPage) {
    return navigateTo('/')
  }
  // 未登录访问受保护页面 → 登录页
  if (!loggedIn && !isAuthPage) {
    return navigateTo('/auth')
  }
})
