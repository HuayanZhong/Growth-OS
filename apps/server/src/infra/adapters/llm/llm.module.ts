import { Module } from '@nestjs/common'
import { DeepseekAdapter } from './deepseek.ts'
import { LLM_ADAPTER } from './llm.token.ts'

/**
 * LLM 适配器注册：消费方 @Inject(LLM_ADAPTER) 拿到契约实例，
 * 换供应商只改本模块的 useClass（阶段四插件化后由插件加载器接管）。
 */
@Module({
  providers: [{ provide: LLM_ADAPTER, useClass: DeepseekAdapter }],
  exports: [LLM_ADAPTER],
})
export class LlmModule {}
