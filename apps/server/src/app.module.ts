import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.ts';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // env 由根目录 dotenv-cli 注入到 process.env，ConfigModule 不再读 .env 文件
      // 这样保持单一真相源，避免子包 cwd 与根目录 .env 路径歧义
      envFilePath: [],
      validate,
    }),
  ],
})
export class AppModule {}
