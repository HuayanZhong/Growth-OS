import type { EntityManager } from '@mikro-orm/postgresql'
import { Seeder } from '@mikro-orm/seeder'

/**
 * 种子数据入口（mikro-orm seeder:run 触发）。
 * 组织约定：Seeder 放在 src/infra/database/seeders/ 下，
 * 具体业务种子在此按依赖顺序调用，例如 this.call(em, [UserSeeder])
 */
export class DatabaseSeeder extends Seeder {
  async run(_em: EntityManager): Promise<void> {
    // 实体建立后在此注册具体 seeder
  }
}
