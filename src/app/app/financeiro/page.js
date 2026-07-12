import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { getActiveContextIds } from "@/lib/active-context";
import { cancelFinancialEntryAction } from "./actions";

export const dynamic = "force-dynamic";
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default async function Finance({ searchParams }) {
  const queryParams = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { projectIds } = await getActiveContextIds(supabase, workspaceId);
  if (!projectIds.length) return <EmptyFinance queryParams={queryParams}/>;
  let query = supabase.from("financial_entries").select("id,description,entry_type,status,amount_cents,occurred_at,due_at,projects(name,slug),clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("created_at", { ascending: false });
  query = query.in("project_id", projectIds);
  if (queryParams.tipo) query = query.eq("entry_type", queryParams.tipo);
  if (queryParams.status) query = query.eq("status", queryParams.status);
  const { data, error } = await query;
  if (error) throw error;
  const active = data.filter((entry) => entry.status !== "cancelled");
  const sum = (filter) => active.filter(filter).reduce((total, entry) => total + entry.amount_cents, 0);
  const received = sum((entry) => entry.entry_type === "income" && entry.status === "paid");
  const costs = sum((entry) => ["expense", "tax", "service_cost", "refund"].includes(entry.entry_type) && entry.status === "paid");
  const discounts = sum((entry) => entry.entry_type === "discount");
  return <AppShell><div className="content">
    <div className="project-head"><div><div className="eyebrow">Controle financeiro</div><h1 className="page-title">Financeiro</h1></div><Link className="btn primary" href="/app/financeiro/novo"><Plus size={15}/> Novo lançamento</Link></div>
    {queryParams.sucesso && <p className="success-note">{queryParams.sucesso}</p>}
    <section className="metrics"><Metric label="Recebido" value={money(received)}/><Metric label="Custos pagos" value={money(costs)}/><Metric label="Descontos" value={money(discounts)}/><Metric label="Resultado" value={money(received - costs)}/></section>
    <form className="filter-bar"><select name="tipo" defaultValue={queryParams.tipo || ""}><option value="">Todos os tipos</option><option value="income">Receita</option><option value="expense">Despesa</option><option value="discount">Desconto</option><option value="tax">Imposto</option><option value="service_cost">Custo de serviço</option></select><select name="status" defaultValue={queryParams.status || ""}><option value="">Todos os status</option><option value="pending">Pendente</option><option value="paid">Pago</option><option value="overdue">Vencido</option><option value="cancelled">Cancelado</option></select><button className="btn">Filtrar</button><Link className="btn" href="/app/financeiro">Limpar</Link></form>
    <section className="panel data-panel"><table><thead><tr><th>Descrição</th><th>Projeto</th><th>Status</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{data.map((entry) => <tr key={entry.id} style={{ opacity: entry.status === "cancelled" ? .55 : 1 }}><td><b>{entry.description}</b><div className="meta">{entry.entry_type}</div></td><td><Link href={`/app/projetos/${entry.projects?.slug}`}>{entry.projects?.name}</Link></td><td><span className="badge">{entry.status}</span></td><td className="mono">{money(entry.amount_cents)}</td><td><div className="table-actions"><Link className="btn" href={`/app/financeiro/${entry.id}/editar`}><Pencil size={13}/> Editar</Link>{entry.status !== "cancelled" && <form action={cancelFinancialEntryAction.bind(null, entry.id)}><button className="btn">Cancelar</button></form>}</div></td></tr>)}</tbody></table>{!data.length && <div className="empty">Nenhum lançamento neste filtro.</div>}</section>
  </div></AppShell>;
}

function Metric({ label, value }) {
  return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div>;
}

function EmptyFinance({ queryParams }) {
  return <AppShell><div className="content"><div className="project-head"><div><div className="eyebrow">Controle financeiro</div><h1 className="page-title">Financeiro</h1></div><Link className="btn primary" href="/app/financeiro/novo"><Plus size={15}/> Novo lançamento</Link></div>{queryParams.sucesso && <p className="success-note">{queryParams.sucesso}</p>}<section className="metrics"><Metric label="Recebido" value={money(0)}/><Metric label="Custos pagos" value={money(0)}/><Metric label="Descontos" value={money(0)}/><Metric label="Resultado" value={money(0)}/></section><section className="panel"><div className="empty">Nenhum lançamento de projeto ativo. Consulte Arquivados para restaurar projetos.</div></section></div></AppShell>;
}
