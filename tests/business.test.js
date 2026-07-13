import test from "node:test";
import assert from "node:assert/strict";
import { calculateFinancialSummary, domainNeedsAlert } from "../src/lib/business.js";

test("calcula saldo contratual, recebido, vencido e despesas", () => {
  assert.deepEqual(calculateFinancialSummary([
    { entry_type: "income", status: "paid", amount_cents: 50000 },
    { entry_type: "income", status: "overdue", amount_cents: 20000 },
    { entry_type: "expense", status: "paid", amount_cents: 8000 },
  ], 112000), {
    received_cents: 50000,
    pending_cents: 62000,
    scheduled_pending_cents: 20000,
    overdue_cents: 20000,
    expense_cents: 8000,
    discount_cents: 0,
    percent_received: 45,
  });
});

test("usa receitas previstas como pendente quando projeto não tem valor combinado", () => {
  const summary = calculateFinancialSummary([
    { entry_type: "income", status: "forecast", amount_cents: 78000 },
    { entry_type: "income", status: "cancelled", amount_cents: 90000 },
  ], 0);
  assert.equal(summary.pending_cents, 78000);
  assert.equal(summary.scheduled_pending_cents, 78000);
});

test("desconto reduz o saldo contratual", () => {
  const summary = calculateFinancialSummary([
    { entry_type: "income", status: "paid", amount_cents: 300000 },
    { entry_type: "discount", status: "paid", amount_cents: 10000 },
  ], 700000);
  assert.equal(summary.pending_cents, 390000);
});

test("pagamento parcial soma somente o valor efetivamente recebido", () => {
  const summary = calculateFinancialSummary([{ entry_type:"income",status:"partially_paid",amount_cents:700000,paid_amount_cents:300000 }],700000);
  assert.equal(summary.received_cents,300000);assert.equal(summary.pending_cents,400000);
});

test("gera atenção apenas dentro da janela de vencimento", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  assert.equal(domainNeedsAlert("2026-07-31", now, 30), true);
  assert.equal(domainNeedsAlert("2026-09-01", now, 30), false);
});
