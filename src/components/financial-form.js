export function FinancialForm({ action, projects, selectedSlug, error, entry = null }) {
  const selected = projects.find((project) => project.slug === selectedSlug);
  const projectId = entry?.project_id || selected?.id || "";
  const dateValue = (value) => value ? String(value).slice(0, 10) : "";
  const amount = entry ? (entry.amount_cents / 100).toFixed(2).replace(".", ",") : "";
  return <form action={action} className="panel form-panel">
    {error && <p className="error">{error}</p>}
    <input type="hidden" name="project_slug" value={selectedSlug || entry?.projects?.slug || ""}/>
    <div className="form-grid">
      <label className="field"><span>Projeto *</span><select name="project_id" defaultValue={projectId} required><option value="" disabled>Selecione</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.clients?.name}</option>)}</select></label>
      <label className="field"><span>Tipo</span><select name="entry_type" defaultValue={entry?.entry_type || "income"}><option value="income">Receita / pagamento</option><option value="expense">Despesa</option><option value="refund">Reembolso</option><option value="discount">Desconto</option><option value="tax">Imposto</option><option value="service_cost">Custo de serviço</option><option value="adjustment">Ajuste</option></select></label>
      <label className="field"><span>Descrição *</span><input name="description" defaultValue={entry?.description || ""} placeholder="Ex.: Entrada do projeto" required/></label>
      <label className="field"><span>Valor (R$) *</span><input name="amount" defaultValue={amount} inputMode="decimal" placeholder="3000,00" required/></label>
      <label className="field"><span>Status</span><select name="status" defaultValue={entry?.status || "paid"}><option value="paid">Pago</option><option value="pending">Pendente</option><option value="forecast">Previsto</option><option value="overdue">Vencido</option><option value="partially_paid">Parcialmente pago</option><option value="cancelled">Cancelado</option></select></label>
      <label className="field"><span>Forma de pagamento</span><select name="payment_method" defaultValue={entry?.payment_method || "pix"}><option value="pix">Pix</option><option value="bank_transfer">Transferência</option><option value="cash">Dinheiro</option><option value="credit_card">Cartão de crédito</option><option value="debit_card">Cartão de débito</option><option value="boleto">Boleto</option><option value="other">Outro</option></select></label>
      <label className="field"><span>Data</span><input name="occurred_at" type="date" defaultValue={dateValue(entry?.occurred_at) || new Date().toISOString().slice(0, 10)}/></label>
      <label className="field"><span>Vencimento</span><input name="due_at" type="date" defaultValue={dateValue(entry?.due_at)}/></label>
      <label className="field full"><span>Observações</span><textarea name="notes" rows="4" defaultValue={entry?.notes || ""}/></label>
    </div>
    <div className="form-actions"><button className="btn primary">{entry ? "Salvar alterações" : "Registrar lançamento"}</button></div>
  </form>;
}
