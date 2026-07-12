const openIncomeStatuses = new Set(["forecast", "pending", "overdue", "partially_paid"]);

export function calculateFinancialSummary(entries, agreedValueCents = 0) {
  const active = entries.filter((item) => item.status !== "cancelled");
  const sum = (filter) => active.filter(filter).reduce((total, item) => total + item.amount_cents, 0);
  const received = sum((item) => item.entry_type === "income" && item.status === "paid");
  const discounts = sum((item) => item.entry_type === "discount");
  const scheduledPending = sum((item) => item.entry_type === "income" && openIncomeStatuses.has(item.status));
  const contractPending = Math.max(agreedValueCents - received - discounts, 0);
  const pending = agreedValueCents > 0 ? contractPending : scheduledPending;
  const expenses = sum((item) => ["expense", "tax", "service_cost"].includes(item.entry_type) && item.status === "paid");
  const overdue = sum((item) => item.entry_type === "income" && item.status === "overdue");
  return {
    received_cents: received,
    pending_cents: pending,
    scheduled_pending_cents: scheduledPending,
    overdue_cents: overdue,
    expense_cents: expenses,
    discount_cents: discounts,
    percent_received: agreedValueCents ? Math.round(received / agreedValueCents * 100) : 0,
  };
}

export function domainNeedsAlert(expiresAt, now = new Date(), thresholdDays = 30) {
  const days = Math.ceil((new Date(expiresAt) - now) / 86400000);
  return days >= 0 && days <= thresholdDays;
}
