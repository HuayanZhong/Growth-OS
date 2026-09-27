import { Migration } from '@mikro-orm/migrations'

export class Migration20260927150014 extends Migration {
  override name = 'Migration20260927150014'

  override up(): void | Promise<void> {
    this.addSql(
      `create table "agents" ("id" text not null, "user_id" text null, "slug" text not null, "name" text not null, "emotion" text not null, "color" text null, "description" text null, "skills" jsonb null, "is_default" boolean not null default false, "created_at" timestamptz not null, primary key ("id"));`,
    )
    this.addSql(`alter table "agents" add constraint "agents_slug_unique" unique ("slug");`)
    this.addSql(`create index "agents_user_id_index" on "agents" ("user_id");`)
    // RLS：自定义行按 user_id 隔离；内置默认 Agent（seed 行，is_default）对所有登录用户只读可见。
    // Supabase 的 rls_auto_enable 触发器只 enable 不建 policy，policy 必须显式声明。
    this.addSql(`alter table "agents" enable row level security;`)
    this.addSql(
      `create policy "agents_user_isolation" on "agents" as permissive for all to authenticated using (user_id = auth.uid()::text or is_default = true) with check (user_id = auth.uid()::text or is_default = true);`,
    )
    // 内置默认 Agent「小花颜」：全局共享单行（服务端 API 无创建/更新/删除通路）。
    // created_at 固定为最早时间戳，保证目录列表 createdAt 升序时默认行自然居首。
    this.addSql(
      `insert into "agents" ("id", "user_id", "slug", "name", "emotion", "is_default", "created_at") values ('seed-agent-xiaohuayan-000000000001', null, 'xiaohuayan', '小花颜', '02', true, '2026-01-01T00:00:00+00:00') on conflict ("slug") do nothing;`,
    )
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "agents" cascade;`)
  }
}
