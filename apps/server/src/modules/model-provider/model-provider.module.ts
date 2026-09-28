import { Module } from '@nestjs/common'
import { createModelFactory } from './factory.ts'

/** DI token：模型工厂（graph 域经此注入，不感知具体供应商适配器） */
export const MODEL_FACTORY = Symbol('MODEL_FACTORY')

/**
 * 模型接入模块：供应商注册表 + 工厂单点出网（骨架决策 6）。
 * 无 controller——纯 provider，仅供编排层消费。
 */
@Module({
  providers: [{ provide: MODEL_FACTORY, useFactory: () => createModelFactory() }],
  exports: [MODEL_FACTORY],
})
export class ModelProviderModule {}
