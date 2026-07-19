import test from "node:test";
import assert from "node:assert/strict";
import { calculateProjectProgress } from "../src/lib/project-progress.js";

test("calcula o progresso real pelas tarefas do projeto", () => {
  assert.equal(calculateProjectProgress([
    { status: "completed" },
    { status: "completed" },
    { status: "todo" },
  ]), 67);
});

test("ignora tarefas canceladas e arquivadas", () => {
  assert.equal(calculateProjectProgress([
    { status: "completed" },
    { status: "todo" },
    { status: "cancelled" },
    { status: "archived" },
  ]), 50);
});

test("projeto sem tarefas só fica em 100% quando concluído", () => {
  assert.equal(calculateProjectProgress([], "active"), 0);
  assert.equal(calculateProjectProgress([], "completed"), 100);
});
