import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RecordDetailsButton } from "@/components/record-details-button";
import { StatusBadge } from "@/components/status-badge";
import { requireWorkspace } from "@/lib/auth-context";
import { getActiveContextIds } from "@/lib/active-context";
import { resolveProjectScope } from "@/lib/project-scope";
import { statusLabel } from "@/lib/status-labels";
import { cancelFinancialEntryAction, deleteFinancialEntryAction } from "./actions";

export const dynamic = "force-dynamic";
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const typeLabel = { income: "Receita", expense: "Despesa", discount: "Desconto", tax: "Imposto", service_cost: "Custo de serviço", refund: "Estorno" };
const date = (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "Não informado";

export default async function Finance({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, q.projeto);
  const { projectIds } = await getActiveContextIds(supabase, workspaceId);
  let query = supabase.from("financial_entries")
    .select("id,description,entry_type,status,amount_cents,paid_amount_cents,category,installment_number,installment_total,occurred_at,due_at,projects(name,slug),clients(name)")
    .eq("workspace_id", workspaceId).is("archived_at", null).order("created_at", { ascending: false });
  query = projectIds.length ? query.in("project_id", projectIds) : query.eq("project_id", "00000000-0000-0000-0000-000000000000");
  if (scope) query = query.eq("project_id", scope.id);
  if (q.tipo) query = query.eq("entry_type", q.tipo);
  if (q.status) query = query.eq("status", q.status);
  const { data, error } = await query;
  if (error) throw error;

  const active = data.filter((x) => x.status !== "cancelled");
  const sum = (filter) => active.filter(filter).reduce((total, item) => total + item.amount_cents, 0);
  const received = active.filter((x) => x.entry_type === "income").reduce((total, item) => total + (item.paid_amount_cents ?? (item.status === "paid" ? item.amount_cents : 0)), 0);
  const costs = sum((x) => ["expense", "tax", "service_cost", "refund"].includes(x.entry_type) && x.status === "paid");
  const discounts = sum((x) => x.entry_type === "discount");
  const base = scope ? `/app/financeiro?projeto=${scope.slug}` : "/app/financeiro";

  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Controle financeiro geral"}</div><h1 className="page-title">Financeiro</h1><p className="subtitle">{scope ? "Somente lançamentos deste projeto." : "Todos os projetos ativos do workspace."}</p></div><Link className="btn primary" href={`/app/financeiro/novo${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Novo lançamento</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}{q.erro && <p className="error">{q.erro}</p>}
    <section className="metrics"><Metric label="Recebido" value={money(received)}/><Metric label="Custos pagos" value={money(costs)}/><Metric label="Descontos" value={money(discounts)}/><Metric label="Resultado" value={money(received - costs)}/></section>
    <form className="filter-bar"><input type="hidden" name="projeto" value={scope?.slug || ""}/><select name="tipo" defaultValue={q.tipo || ""}><option value="">Todos os tipos</option><option value="income">Receita</option><option value="expense">Despesa</option><option value="discount">Desconto</option><option value="tax">Imposto</option></select><select name="status" defaultValue={q.status || ""}><option value="">Todos os status</option><option value="pending">Pendente</option><option value="paid">Pago</option><option value="overdue">Vencido</option><option value="cancelled">Cancelado</option></select><button className="btn">Filtrar</button><Link className="btn" href={base}>Limpar</Link></form>
    <section className="panel data-panel"><table className="uniform-compact-list"><thead><tr><th>Descrição</th><th>Projeto</th><th>Status</th><th>Valor</th></tr></thead><tbody>{data.map((item) => {
      const canDelete = Number(item.paid_amount_cents || 0) === 0 && !["paid", "partially_paid"].includes(item.status);
      return <tr key={item.id} style={{ opacity: item.status === "cancelled" ? .55 : 1 }}>
        <td data-label="Lançamento"><RecordDetailsButton label="Detalhes financeiros" title={item.description} summary={`${typeLabel[item.entry_type] || item.entry_type} · ${money(item.amount_cents)}`} details={[
          { label: "Projeto", value: item.projects?.name || "Sem projeto" }, { label: "Cliente", value: item.clients?.name },
          { label: "Tipo", value: typeLabel[item.entry_type] || item.entry_type }, { label: "Categoria", value: item.category },
          { label: "Status", value: statusLabel(item.status) }, { label: "Valor", value: money(item.amount_cents) },
          { label: "Valor pago", value: money(item.paid_amount_cents || 0) }, { label: "Competência", value: date(item.occurred_at) },
          { label: "Vencimento", value: date(item.due_at) }, { label: "Parcela", value: item.installment_total ? `${item.installment_number || 1}/${item.installment_total}` : null }
        ]} editHref={`/app/financeiro/${item.id}/editar`}>
          {item.status !== "cancelled" && <form action={cancelFinancialEntryAction.bind(null, item.id)}><ConfirmSubmitButton className="btn" message={`Cancelar o lançamento “${item.description}”?`}>Cancelar</ConfirmSubmitButton></form>}
          {canDelete && <form action={deleteFinancialEntryAction.bind(null, item.id)}><ConfirmSubmitButton className="btn danger" message={`Excluir definitivamente o lançamento “${item.description}”? Esta ação não pode ser desfeita.`}><Trash2 size={14}/> Excluir</ConfirmSubmitButton></form>}
        </RecordDetailsButton></td>
        <td data-label="Projeto" data-mobile="secondary">{item.projects?.name || "—"}</td>
        <td data-label="Status" data-mobile="secondary"><StatusBadge status={item.status}/></td>
        <td data-label="Valor" data-mobile="key" className="mono">{money(item.amount_cents)}</td>
      </tr>;
    })}</tbody></table>{!data.length && <div className="empty">Nenhum lançamento neste contexto.</div>}</section>
  </div></AppShell>;
}

function Metric({ label, value }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div>; }
