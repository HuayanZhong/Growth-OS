// 导航激活判断与链接样式：侧边栏及二级菜单复用（对标 Coze 高亮规则）
export function useNavActive() {
  const route = useRoute()

  // exact 精确匹配（概览），否则前缀匹配（子路由同样高亮）
  function isActive(path: string, exact = false) {
    if (exact) return route.path === path
    return route.path === path || route.path.startsWith(`${path}/`)
  }

  // 导航链接样式：激活态浅色底 + primary 文字，未激活态悬停浅灰
  function navClass(path: string) {
    return isActive(path)
      ? 'rounded-lg bg-primary/10 font-medium text-primary transition-colors'
      : 'rounded-lg text-base-content/70 transition-colors hover:bg-base-300'
  }

  return { isActive, navClass }
}
