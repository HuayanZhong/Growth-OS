import { Body, Controller, Post, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { createChatStreamSchema, encodeChatStreamFrame } from '@growth-os/types'
import type { CreateChatStreamInput } from '@growth-os/types'
import { ApiDataOk, ApiErrorResponses, toOpenApiSchema } from '../../common/openapi/schema.ts'
import { SkipTimeout } from '../../common/decorators/skip-timeout.decorator.ts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.ts'
import { ChatStreamService } from './chat-stream.service.ts'

/**
 * SSE 聊天端点（数据面）：raw res.write 而非 @Sse——
 * @Sse 的 Observable 会经过响应信封拦截器链（该拦截器的 SSE 豁免注释
 * 明确以 controller 直接操作 res 为前提），且拿不到 res 做断连检测；
 * raw 写出与 @SkipTimeout、压缩豁免（Content-Type includes 判定）成套。
 *
 * 断连：res 'close'（未正常收尾时）→ AbortController → AbortSignal 透传
 * 编排层终止模型调用；正常完成时 writableEnded 为 true，不误触发。
 */
@ApiTags('chat')
@ApiBearerAuth()
@ApiErrorResponses('400', '401', '500')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatStreamService: ChatStreamService) {}

  @Post('stream')
  @SkipTimeout()
  @ApiOperation({ summary: '流式聊天：请求体携带历史，SSE 帧推送 ChatStreamEvent' })
  @ApiDataOk(toOpenApiSchema(createChatStreamSchema, 'output'), 'SSE 事件流')
  async stream(
    @Body(new ZodValidationPipe(createChatStreamSchema)) input: CreateChatStreamInput,
    @Res() res: Response,
  ): Promise<void> {
    res.status(200)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const abort = new AbortController()
    const onClientClose = () => {
      if (!res.writableEnded) abort.abort()
    }
    res.on('close', onClientClose)

    try {
      for await (const event of this.chatStreamService.run(input, abort.signal)) {
        if (res.writableEnded || abort.signal.aborted) break
        res.write(encodeChatStreamFrame(event))
      }
    } finally {
      res.off('close', onClientClose)
      res.end()
    }
  }
}
