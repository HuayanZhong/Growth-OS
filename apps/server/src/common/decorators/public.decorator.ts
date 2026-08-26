import { SetMetadata } from '@nestjs/common'

/**
 * 标记路由为公开端点，SupabaseJwtGuard 直接放行（默认拒绝原则的豁免口）。
 * 用法：在 controller 方法或类上标注 @Public()。
 */
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
