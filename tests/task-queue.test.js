import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/202607230002_add_task_queue_position.sql", import.meta.url), "utf8");
const dashboardService = readFileSync(new URL("../src/services/project-dashboard.js", import.meta.url), "utf8");
const taskActions = readFileSync(new URL("../src/app/app/tarefas/actions.js", import.meta.url), "utf8");

test("migração cria e preenche uma posição persistente por fila", () => {
  assert.match(migration, /add column if not exists queue_position bigint/i);
  assert.match(migration, /partition by workspace_id, project_id/i);
  assert.match(migration, /tasks_workspace_project_queue_idx/i);
});

test("painel do projeto lê tarefas na ordem manual", () => {
  assert.match(dashboardService, /order\("queue_position", \{ ascending: true, nullsFirst: false \}\)/);
});

test("reordenação fica restrita ao workspace e ao projeto da tarefa", () => {
  assert.match(taskActions, /export async function moveTaskInQueueAction/);
  assert.match(taskActions, /export async function reorderTaskQueueAction/);
  assert.match(taskActions, /\.eq\("workspace_id", workspaceId\)/);
  assert.match(taskActions, /projectIds\.size !== 1/);
  assert.match(taskActions, /\["completed", "cancelled", "archived"\]\.includes\(item\.status\)/);
});

test("nova tarefa pode ser inserida antes ou depois de outra tarefa", () => {
  assert.match(taskActions, /async function placeCreatedTask/);
  assert.match(taskActions, /\["before", "after"\]\.includes\(relation\)/);
  assert.match(taskActions, /formData\.get\("queue_placement"\)/);
});

test("status da tarefa pode ser alterado rapidamente com segurança", () => {
  assert.match(taskActions, /export async function updateTaskStatusAction/);
  assert.match(taskActions, /if \(!allowed\.includes\(status\)\)/);
  assert.match(taskActions, /completed_at: status === "completed"/);
  assert.match(taskActions, /await recalculate\(supabase, workspaceId, task\.project_id\)/);
});
