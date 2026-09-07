import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { SessionEventEntity } from './entities/session-event.entity.ts'
import { SessionsController } from './sessions.controller.ts'
import { SessionsService } from './sessions.service.ts'

@Module({
  imports: [MikroOrmModule.forFeature([SessionEventEntity])],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
