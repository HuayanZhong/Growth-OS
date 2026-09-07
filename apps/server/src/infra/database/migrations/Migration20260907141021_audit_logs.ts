import { Migration } from '@mikro-orm/migrations'

export class Migration20260907141021_audit_logs extends Migration {
  override name = 'Migration20260907141021_audit_logs'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "audit_logs" ("seq" serial primary key, "id" text not null, "actor_id" text not null, "action" text not null, "resource_type" text not null, "resource_id" text not null, "timestamp" timestamptz not null, "details" jsonb null);`,
    )
    this.addSql(`alter table "audit_logs" add constraint "audit_logs_id_unique" unique ("id");`)
    this.addSql(`create index "audit_logs_timestamp_index" on "audit_logs" ("timestamp");`)
    this.addSql(`create index "audit_logs_actor_id_index" on "audit_logs" ("actor_id");`)
    this.addSql(
      `create index "audit_logs_resource_type_resource_id_index" on "audit_logs" ("resource_type", "resource_id");`,
    )
    this.addSql(`create index "audit_logs_action_index" on "audit_logs" ("action");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "audit_logs" cascade;`)
  }
}
