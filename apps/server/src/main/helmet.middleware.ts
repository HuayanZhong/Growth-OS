import helmet from 'helmet'

const isProd = process.env.NODE_ENV === 'production'

/**
 * 安全头中间件工厂。
 *
 * Helmet 为 HTTP 响应添加一系列安全头（X-Content-Type-Options、X-Frame-Options 等），
 * 防止常见 Web 攻击（MIME 嗅探、点击劫持、XSS 等）。
 *
 * 环境策略：
 *   - 开发 / Electron（file:// 协议）：CSP 和 COEP 禁用，否则 inline script / style / preload 被阻断导致白屏。
 *   - 生产 HTTPS 部署：开启 CSP（default-src 'self'）+ COEP，防止 XSS 和侧信道攻击。
 */
export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: isProd,
  })
}
