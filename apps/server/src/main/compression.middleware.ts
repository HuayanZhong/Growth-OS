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
 */
export function compressionMiddleware(): ReturnType<typeof compression> {
  return compression({
    threshold: 1024,
    filter: (req: Request, res: Response) => {
      if (req.headers.accept === 'text/event-stream') return false
      return compression.filter(req, res)
    },
  })
}
