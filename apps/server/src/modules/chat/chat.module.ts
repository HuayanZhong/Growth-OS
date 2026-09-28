import { Module } from '@nestjs/common'
import { GraphModule } from '../graph/graph.module.ts'
import { ChatController } from './chat.controller.ts'
import { ChatStreamService } from './chat-stream.service.ts'

/** SSE 聊天面：流式端点 + 流编排（意图占位 → graph 回合执行 → 契约映射） */
@Module({
  imports: [GraphModule],
  controllers: [ChatController],
  providers: [ChatStreamService],
})
export class ChatModule {}
