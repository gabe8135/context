import { z } from "zod";

const parseMoney = (value) => Number(String(value || "0").replace(/[^0-9,.-]/g, "").replace(/\.(?=.*\.)/g, "").replace(",", "."));

export const financialSchema = z.object({
  project_id: z.string().uuid(), description: z.string().trim().min(2, "Informe uma descrição."),
  entry_type: z.enum(["income","expense","refund","discount","adjustment","tax","service_cost"]),
  status: z.enum(["forecast","pending","paid","overdue","cancelled","partially_paid"]), amount: z.string().min(1, "Informe o valor."),
  paid_amount: z.string().optional(), category: z.string().trim().max(80).optional(), installment_number: z.string().optional(), installment_total: z.string().optional(),
  occurred_at: z.string().optional(), due_at: z.string().optional(), paid_at: z.string().optional(), payment_method: z.string().trim().max(60).optional(), notes: z.string().trim().max(2000).optional(),
});

export function financialPayload(formData) {
  const values = financialSchema.parse(Object.fromEntries(formData.entries()));
  const amount = parseMoney(values.amount); let paidAmount = parseMoney(values.paid_amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Informe um valor maior que zero.");
  if (values.status === "paid") paidAmount = amount;
  else if (values.status !== "partially_paid") paidAmount = 0;
  if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > amount) throw new Error("O valor pago deve ficar entre zero e o valor total.");
  const installmentNumber = values.installment_number ? Number(values.installment_number) : null;
  const installmentTotal = values.installment_total ? Number(values.installment_total) : null;
  if ((installmentNumber && !installmentTotal) || (!installmentNumber && installmentTotal) || installmentNumber > installmentTotal) throw new Error("Informe uma parcela válida, por exemplo 1 de 3.");
  return { ...values, amount: undefined, paid_amount: undefined, amount_cents: Math.round(amount * 100), paid_amount_cents: Math.round(paidAmount * 100),
    category: values.category || null, installment_number: installmentNumber, installment_total: installmentTotal,
    occurred_at: values.occurred_at || null, due_at: values.due_at || null, paid_at: paidAmount > 0 ? (values.paid_at || new Date().toISOString().slice(0,10)) : null };
}
