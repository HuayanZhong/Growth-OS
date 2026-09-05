import { Module } from '@nestjs/common'
import { SessionsController } from './sessions.controller.ts'
import { SessionsService } from './sessions.service.ts'

@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
