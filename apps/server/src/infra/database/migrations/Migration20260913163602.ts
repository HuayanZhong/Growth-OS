import { Migration } from '@mikro-orm/migrations'

export class Migration20260913163602 extends Migration {
  override name = 'Migration20260913163602'

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

    this
      .addSql(`create or replace function "rls_auto_enable"() returns event_trigger security definer volatile language plpgsql as $$ begin DECLARE
  cmd record; BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);         RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;       EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;       END;      ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;      END IF;   END LOOP; END; end $$;`)
  }
}
