import { Migration } from '@mikro-orm/migrations'

export class Migration20260907124411_session_events extends Migration {
  override name = 'Migration20260907124411_session_events'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "session_events" ("seq" serial primary key, "id" text not null, "session_id" text not null, "agent_id" text null, "type" text not null, "timestamp" timestamptz not null, "payload" jsonb not null);`,
    )
    this.addSql(
      `alter table "session_events" add constraint "session_events_id_unique" unique ("id");`,
    )
    this.addSql(
      `create index "session_events_session_id_seq_index" on "session_events" ("session_id", "seq");`,
    )
    this.addSql(`create index "session_events_agent_id_index" on "session_events" ("agent_id");`)
    this.addSql(`create index "session_events_type_index" on "session_events" ("type");`)
    this.addSql(`create index "session_events_timestamp_index" on "session_events" ("timestamp");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "session_events" cascade;`)
  }
}
