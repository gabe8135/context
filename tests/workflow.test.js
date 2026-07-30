import test from "node:test";
import assert from "node:assert/strict";
import { buildNarrativeSummary, chooseCurrentFocus, isTaskBlockedByDependency, nextRecurringDate } from "../src/lib/workflow.js";

test("dependência bloqueia a tarefa até a predecessora ser concluída", () => {
  assert.equal(isTaskBlockedByDependency({ depends_on_task_id: "a", depends_on_task: { status: "todo" } }), true);
  assert.equal(isTaskBlockedByDependency({ depends_on_task_id: "a", depends_on_task: { status: "completed" } }), false);
});

test("foco diário ignora tarefas concluídas e bloqueadas", () => {
  const focus = chooseCurrentFocus([
    { id: "blocked", title: "Bloqueada", status: "todo", priority: "urgent", depends_on_task_id: "a", depends_on_task: { status: "todo" } },
    { id: "done", title: "Concluída", status: "completed", priority: "urgent" },
    { id: "available", title: "Disponível", status: "todo", priority: "high", queue_position: 1000 },
  ], new Date("2026-07-30T12:00:00Z"));
  assert.equal(focus.id, "available");
});

test("recorrência preserva intervalo diário, semanal e mensal", () => {
  assert.equal(nextRecurringDate("2026-07-30T10:00:00Z", "daily", 2).toISOString(), "2026-08-01T10:00:00.000Z");
  assert.equal(nextRecurringDate("2026-07-30T10:00:00Z", "weekly", 2).toISOString(), "2026-08-13T10:00:00.000Z");
  assert.equal(nextRecurringDate("2026-07-15T10:00:00Z", "monthly", 1).toISOString(), "2026-08-15T10:00:00.000Z");
});

test("histórico narrativo resume movimentações e pendências", () => {
  const now = new Date();
  const summary = buildNarrativeSummary({
    activities: [
      { type: "task_completed", created_at: now.toISOString() },
      { type: "decision_created", created_at: now.toISOString() },
    ],
    tasks: [{ status: "todo" }, { status: "completed" }],
  });
  assert.match(summary, /1 tarefa foi concluída/);
  assert.match(summary, /1 decisão foi registrada/);
  assert.match(summary, /Resta 1 pendência/);
});
