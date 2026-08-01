import { z } from 'zod'

/**
 * 认证相关 zod schema。
 *
 * 职责分离：类型与校验规则集中在本包分发，前后端共用同一套约束，
 * 避免 app 各自维护一份导致漂移（如邮箱规则不一致）。
 * 接入 Supabase Auth 后，表单提交与 server 端入参校验直接复用。
 */

/** 登录/注册共用的凭证（邮箱 + 密码） */
const credentialsSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  password: z.string().min(8, '密码至少 8 位'),
})

/** 登录入参 */
export const loginSchema = credentialsSchema

/** 注册入参（当前与登录一致；后续需扩展字段时在此拆分） */
export const registerSchema = credentialsSchema

/** 登录入参的类型（z.infer 结果，供前端表单与后端 DTO 使用） */
export type LoginInput = z.infer<typeof loginSchema>

/** 注册入参的类型 */
export type RegisterInput = z.infer<typeof registerSchema>
