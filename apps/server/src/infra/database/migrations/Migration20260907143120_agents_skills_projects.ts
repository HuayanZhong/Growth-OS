import { Migration } from '@mikro-orm/migrations'

export class Migration20260907143120_agents_skills_projects extends Migration {
  override name = 'Migration20260907143120_agents_skills_projects'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "agents" ("id" text not null, "name" text not null, "system_prompt" text not null, "model" text not null, "tool_ids" jsonb not null, "description" text null, "enabled" boolean not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`create index "agents_name_index" on "agents" ("name");`)

    this.addSql(
      `create table "projects" ("id" text not null, "name" text not null, "description" text null, "agent_ids" jsonb not null, "session_ids" jsonb not null, "skill_ids" jsonb not null, "file_ids" jsonb not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`create index "projects_name_index" on "projects" ("name");`)

    this.addSql(
      `create table "skills" ("id" text not null, "name" text not null, "description" text null, "enabled" boolean not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`create index "skills_name_index" on "skills" ("name");`)
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "agents" cascade;`)
    this.addSql(`drop table if exists "projects" cascade;`)
    this.addSql(`drop table if exists "skills" cascade;`)
  }
}
