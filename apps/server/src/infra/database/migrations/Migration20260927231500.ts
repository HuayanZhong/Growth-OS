import { Migration } from '@mikro-orm/migrations'

export class Migration20260927231500 extends Migration {
  override name = 'Migration20260927231500'

  override up(): void | Promise<void> {
    // 同一用户下 Agent 名称唯一（默认 Agent seed 行 user_id 为空，不参与约束）。
    // 应用层 create 先查重返回 409 AGENT_NAME_EXISTS，此约束兜底并发。
    this.addSql(
      `create unique index "agents_user_id_name_unique" on "agents" ("user_id", "name") where "user_id" is not null;`,
    )
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index if exists "agents_user_id_name_unique";`)
  }
}
