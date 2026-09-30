import { createChatStreamSchema } from '@growth-os/types'
import { isRegisteredModel } from '../model-provider/registry.ts'

/**
 * 服务端请求 schema：契约形态 + modelId 注册表归属校验。
 * 未知模型在流建立前被 ZodValidationPipe 以 ApiErrorEnvelope 拒绝，
 * 不进入编排（契约 schema 无法感知服务端注册表，归属校验在此收口）。
 */
export const chatStreamRequestSchema = createChatStreamSchema.superRefine((input, ctx) => {
  if (input.modelId !== undefined && !isRegisteredModel(input.modelId)) {
    ctx.addIssue({
      code: 'custom',
      message: `未知模型 '${input.modelId}'`,
      path: ['modelId'],
    })
  }
})
