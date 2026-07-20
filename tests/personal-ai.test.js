import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const assistantAction = readFileSync(new URL("../src/app/app/assistente/actions.js", import.meta.url), "utf8");
const assistantRoute = readFileSync(new URL("../src/app/api/ai/assistant/route.js", import.meta.url), "utf8");
const organizerAction = readFileSync(new URL("../src/app/app/organizar/actions.js", import.meta.url), "utf8");

test("assistente permite tarefas e notas pessoais com confirmação", () => {
  assert.match(assistantAction, /project_id: z\.string\(\)\.uuid\(\)\.nullable\(\)/);
  assert.match(assistantAction, /project_id: project\?\.id \|\| null/);
  assert.match(assistantRoute, /\["task", "note"\]\.includes\(proposal\.type\)/);
});

test("assistente geral lê a agenda pessoal e preserva escopo", () => {
  assert.match(assistantRoute, /project_id\.is\.null/);
  assert.match(assistantRoute, /scope\.type === "general"/);
  assert.match(assistantRoute, /Decisões exigem projeto/);
});

test("organizador pessoal bloqueia entidades que exigem projeto", () => {
  assert.match(organizerAction, /!\["task", "note"\]\.includes\(item\.type\)/);
  assert.match(organizerAction, /Na agenda pessoal confirme somente tarefas e notas/);
});
