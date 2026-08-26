import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth.controller.ts'
import { JwtVerifierService } from './jwt-verifier.service.ts'
import { SupabaseJwtGuard } from './supabase-jwt.guard.ts'

/**
 * 鉴权模块：注册全局 Guard（APP_GUARD）。
 * 用 useExisting 而非 useClass：Guard 实例与容器内 provider 共享，
 * 测试时 override SupabaseJwtGuard 即可生效（NestJS 官方 testing 指南建议）。
 */
@Module({
  controllers: [AuthController],
  providers: [
    JwtVerifierService,
    SupabaseJwtGuard,
    { provide: APP_GUARD, useExisting: SupabaseJwtGuard },
  ],
})
export class AuthModule {}
