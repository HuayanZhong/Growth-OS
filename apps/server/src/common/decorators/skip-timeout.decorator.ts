import { SetMetadata } from '@nestjs/common'

export const SKIP_TIMEOUT = 'skipTimeout'

/**
 * 跳过超时拦截器。
 *
 * 用法：@SkipTimeout() 放在 controller 方法上，该方法的响应不会被 TimeoutInterceptor 截断。
 * 典型场景：SSE 流式端点（/ai/chat）响应可持续数分钟，固定超时会误杀。
 */
export const SkipTimeout = () => SetMetadata(SKIP_TIMEOUT, true)
