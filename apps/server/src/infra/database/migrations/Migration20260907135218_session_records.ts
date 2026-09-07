import { Migration } from '@mikro-orm/migrations'

export class Migration20260907135218_session_records extends Migration {
  override name = 'Migration20260907135218_session_records'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "session_records" ("id" text not null, "agent_id" text not null, "title" text not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`create index "session_records_agent_id_index" on "session_records" ("agent_id");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "session_records" cascade;`)
  }
}
