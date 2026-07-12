import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { getActiveContextIds } from "@/lib/active-context";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const { supabase, workspaceId } = await requireWorkspace();
  const { clientIds, projectIds } = await getActiveContextIds(supabase, workspaceId);
  const empty = Promise.resolve({ data: [], error: null });
  const [projects, tasks, clients, finance, activities] = await Promise.all([
    projectIds.length ? supabase.from("projects").select("id,name,slug,status,progress,clients(name)").eq("workspace_id", workspaceId).in("id", projectIds) : empty,
    projectIds.length ? supabase.from("tasks").select("id,title,due_at,status,projects(name,slug)").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).not("status", "in", "(completed,cancelled,archived)").order("due_at", { ascending: true, nullsFirst: false }).limit(8) : empty,
    clientIds.length ? supabase.from("clients").select("id").eq("workspace_id", workspaceId).in("id", clientIds) : empty,
    projectIds.length ? supabase.from("financial_entries").select("entry_type,status,amount_cents").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null) : empty,
    projectIds.length ? supabase.from("activities").select("id,description,created_at,projects(name,slug)").eq("workspace_id", workspaceId).in("project_id", projectIds).order("created_at", { ascending: false }).limit(8) : empty,
  ]);
  const failed = [projects, tasks, clients, finance, activities].find((result) => result.error);
  if (failed) throw failed.error;
  const received = (finance.data || []).filter((entry) => entry.entry_type === "income" && entry.status === "paid").reduce((sum, entry) => sum + entry.amount_cents, 0);
  const now = new Date();
  const overdue = (tasks.data || []).filter((task) => task.due_at && new Date(task.due_at) < now).length;
  return <AppShell><div className="content"><div className="project-head"><div><div className="eyebrow">Visão geral</div><h1 className="page-title">Seu trabalho em um só lugar</h1><p className="subtitle">Resumo real do workspace e próximas ações.</p></div><div className="actions"><Link className="btn" href="/app/clientes/novo">Novo cliente</Link><Link className="btn primary" href="/app/projetos/novo">Novo projeto</Link></div></div><section className="metrics"><Metric label="Projetos ativos" value={(projects.data || []).filter((project) => project.status === "active").length}/><Metric label="Clientes" value={clients.data?.length || 0}/><Metric label="Tarefas atrasadas" value={overdue}/><Metric label="Recebido" value={money(received)}/></section><div className="dashboard-grid"><List title="Próximas tarefas" rows={tasks.data || []} render={(item) => [item.title, `${item.projects?.name || "Sem projeto"} · ${item.due_at ? new Date(item.due_at).toLocaleDateString("pt-BR") : "Sem prazo"}`, item.projects?.slug ? `/app/projetos/${item.projects.slug}` : "/app/tarefas"]}/><List title="Atividade recente" rows={activities.data || []} render={(item) => [item.description, new Date(item.created_at).toLocaleString("pt-BR"), item.projects?.slug ? `/app/projetos/${item.projects.slug}` : "/app/projetos"]}/></div><section className="panel" style={{ marginTop: 20 }}><div className="panel-head"><div className="panel-title">Projetos</div><Link href="/app/projetos">Ver todos</Link></div>{(projects.data || []).length ? (projects.data || []).slice(0, 6).map((project) => <Link className="item" href={`/app/projetos/${project.slug}`} key={project.id}><div className="item-main"><div className="item-title">{project.name}</div><div className="meta">{project.clients?.name} · {project.status} · {project.progress}%</div></div></Link>) : <div className="empty">Nenhum projeto ativo.</div>}</section></div></AppShell>;
}

function Metric({ label, value }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div>; }
function List({ title, rows, render }) { return <section className="panel"><div className="panel-head"><div className="panel-title">{title}</div><span className="badge">{rows.length}</span></div>{rows.length ? rows.map((item) => { const [name, meta, href] = render(item); return <Link className="item" href={href} key={item.id}><div><div className="item-title">{name}</div><div className="meta">{meta}</div></div></Link>; }) : <div className="empty">Nada pendente nesta seção.</div>}</section>; }
function money(cents) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100); }
