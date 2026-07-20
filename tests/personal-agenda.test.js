import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { taskPayload } from "../src/lib/validations/task.js";

test("aceita tarefa pessoal sem projeto", () => {
  const form = new FormData();
  form.set("project_id", "");
  form.set("title", "Comprar material de escritório");
  form.set("status", "todo");
  form.set("priority", "medium");
  const payload = taskPayload(form);
  assert.equal(payload.project_id, null);
  assert.equal(payload.client_id, undefined);
});

test("migração libera somente o vínculo de projeto das tarefas", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260720033758_allow_personal_tasks.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.tasks/i);
  assert.match(sql, /alter column project_id drop not null/i);
});

test("PWA abre na página inicial geral", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.start_url, "/app");
});
