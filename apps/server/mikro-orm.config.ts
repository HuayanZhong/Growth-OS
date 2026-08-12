import { defineConfig } from '@mikro-orm/postgresql'

export default defineConfig({
  entities: [],

  // 调试模式：DB_DEBUG=true 时打印 SQL 查询与参数（生产环境应保持 false）
  debug: process.env.DB_DEBUG === 'true',
})
