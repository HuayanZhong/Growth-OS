import helmet from 'helmet'

/**
 * 安全头中间件工厂。
 *
 * Helmet 为 HTTP 响应添加一系列安全头（X-Content-Type-Options、X-Frame-Options 等），
 * 防止常见 Web 攻击（MIME 嗅探、点击劫持、XSS 等）。
 *
 * contentSecurityPolicy 关闭原因：
 *   桌面端 Electron 通过 file:// 协议加载资源，CSP 默认策略会阻止 inline script / style，
 *   导致页面白屏。生产环境如果切换为 HTTPS 部署（非 Electron），应开启 CSP 并配置白名单。
 *
 * crossOriginEmbedderPolicy 关闭原因：
 *   Electron 的 webview 和 preload 脚本需要跨域加载资源，COEP 会阻断这些请求。
 */
export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
}
