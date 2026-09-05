import { NotImplementedException } from '@nestjs/common'

/**
 * 骨架统一 501 信封：写路径尚未实现的能力抛此异常。
 * AllExceptionsFilter 对 { code, message } 载荷的 HttpException 原样透传，
 * 客户端拿到 ApiErrorEnvelope { code: 'NOT_IMPLEMENTED' }。
 */
export function notImplemented(capability: string): NotImplementedException {
  return new NotImplementedException({
    code: 'NOT_IMPLEMENTED',
    message: `${capability}尚未实现`,
  })
}
