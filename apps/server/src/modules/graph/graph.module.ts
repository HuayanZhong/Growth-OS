import { Module } from '@nestjs/common'
import { MODEL_FACTORY, ModelProviderModule } from '../model-provider/model-provider.module.ts'
import { createChatTurnRunner } from './run-chat-turn.ts'

/** DI token：回合执行器（chat 域经此消费编排能力） */
export const CHAT_TURN = Symbol('CHAT_TURN')

/**
 * 编排引擎模块：langgraph/deepagents 全仓唯一收口（骨架决策 3）。
 * model 工厂来自 model-provider，Agent 装配在模块加载时完成一次。
 */
@Module({
  imports: [ModelProviderModule],
  providers: [
    {
      provide: CHAT_TURN,
      useFactory: (factory: Parameters<typeof createChatTurnRunner>[0]) =>
        createChatTurnRunner(factory),
      inject: [MODEL_FACTORY],
    },
  ],
  exports: [CHAT_TURN],
})
export class GraphModule {}
