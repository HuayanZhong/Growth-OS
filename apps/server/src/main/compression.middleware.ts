import type { Request, Response } from 'express'
import compression from 'compression'

/**
 * 响应压缩中间件工厂。
 *
 * 问题背景：
 *   JSON 响应（历史消息列表、知识库搜索结果等）体积可达数十 KB，
 *   桌面端网络传输浪费带宽。开启 gzip 可压缩 60-80%。
 *
 * 设计要点：
 *   - threshold: 1024 → 仅压缩 ≥1KB 的响应。小于 1KB 的响应压缩后反而更大（gzip 头开销）。
 *   - filter 回调排除 SSE 端点：流式响应（text/event-stream）已逐块发送，
 *     压缩会缓冲输出导致客户端收不到实时数据（浏览器 SSE parser 无法解压 gzip）。
 *   - SSE 检测用 includes 而非 ===：浏览器 Accept 头可能是
 *     'text/event-stream, text/plain'（含多种 MIME），精确匹配永远不命中。
 */
export function compressionMiddleware(): ReturnType<typeof compression> {
  return compression({
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      // 检查响应 Content-Type（比 Accept 更可靠：Content-Type 是实际输出类型）。
      // 若 res 已写入 header 且是 SSE，跳过压缩。
      const resHeader = res.getHeader('Content-Type')
      if (typeof resHeader === 'string' && resHeader.includes('text/event-stream')) return false
      // 回退检查请求 Accept（兜底：controller 还没写 Content-Type 时）
      const accept = req.headers.accept
      if (typeof accept === 'string' && accept.includes('text/event-stream')) return false
      return compression.filter(req, res)
    },
  })
}
