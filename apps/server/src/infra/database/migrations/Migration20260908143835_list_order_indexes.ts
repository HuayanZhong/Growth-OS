import { Migration } from '@mikro-orm/migrations'

export class Migration20260908143835_list_order_indexes extends Migration {
  override name = 'Migration20260908143835_list_order_indexes'

  override up(): void | Promise<void> {
    this.addSql(`create index "agents_updated_at_index" on "agents" ("updated_at");`)

    this.addSql(`create index "projects_updated_at_index" on "projects" ("updated_at");`)

    this.addSql(
      `create index "session_records_updated_at_index" on "session_records" ("updated_at");`,
    )

    this.addSql(`create index "skills_updated_at_index" on "skills" ("updated_at");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "agents_updated_at_index";`)

    this.addSql(`drop index "projects_updated_at_index";`)

    this.addSql(`drop index "session_records_updated_at_index";`)

    this.addSql(`drop index "skills_updated_at_index";`)
  }
}
