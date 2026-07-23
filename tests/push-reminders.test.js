import assert from "node:assert/strict";
import test from "node:test";
import { collectDueReminders, notificationTarget, reminderWindow } from "../src/lib/push-reminders.js";

const now = new Date("2026-07-23T12:00:00.000Z");

test("janela tolera atraso do cron sem perder o lembrete", () => {
  const { start, end } = reminderWindow(now);
  assert.equal(start.toISOString(), "2026-07-23T11:50:00.000Z");
  assert.equal(end.toISOString(), "2026-07-23T12:01:30.000Z");
});

test("seleciona tarefas e reuniões vencidas há poucos minutos", () => {
  const due = collectDueReminders({
    tasks: [{ id: "task", reminder_at: "2026-07-23T11:56:00.000Z", due_at: "2026-07-23T13:00:00.000Z" }],
    meetings: [{ id: "meeting", reminder_at: "2026-07-23T11:59:00.000Z", scheduled_at: "2026-07-23T12:30:00.000Z" }],
  }, now);
  assert.deepEqual(due.map((item) => item.id), ["task", "meeting"]);
});

test("calcula antecipação de eventos e ignora horários fora da janela", () => {
  const due = collectDueReminders({
    events: [
      { id: "inside", starts_at: "2026-07-23T12:30:00.000Z", reminder_minutes: [30] },
      { id: "outside", starts_at: "2026-07-23T14:00:00.000Z", reminder_minutes: [30] },
    ],
  }, now);
  assert.deepEqual(due.map((item) => item.id), ["inside"]);
});

test("abre o projeto correto quando há contexto", () => {
  assert.equal(notificationTarget({ project_slug: "saas-squire" }), "/app/projetos/saas-squire");
  assert.equal(notificationTarget({ project_slug: null }), "/app/agenda");
});
