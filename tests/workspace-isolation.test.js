import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const migration=readFileSync(new URL("../supabase/migrations/202607120006_product_completion.sql",import.meta.url),"utf8");
const tables=["note_versions","procedure_versions","calendar_events","entity_relations","tags","entity_tags","project_templates","project_template_items","user_preferences","alert_rules"];
test("todas as novas entidades habilitam RLS",()=>{for(const table of tables)assert.match(migration,new RegExp(`alter table public\\.%I enable row level security|array.*${table}`,"is"),`${table} precisa estar no bloco RLS`)});
test("políticas exigem membership do workspace e bloqueiam anon",()=>{assert.match(migration,/private\.is_workspace_member\(workspace_id\)/);assert.match(migration,/revoke all on public\.%I from anon/);assert.match(migration,/with check\(\(select private\.is_workspace_member/)});
test("update possui USING e WITH CHECK",()=>{assert.match(migration,/for update to authenticated using\(.+with check\(/s)});
