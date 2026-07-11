import Link from "next/link";
import { CalendarDays, CheckSquare, AlertTriangle, Landmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";
const date = value => value ? new Date(value).toLocaleString("pt-BR", {dateStyle:"short",timeStyle:"short"}) : "Sem data";

export default async function InboxPage() {
  const { supabase, workspaceId } = await requireWorkspace();
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400000).toISOString();
  const [tasksResult, meetingsResult, financeResult] = await Promise.all([
    supabase.from("tasks").select("id,title,status,priority,due_at,projects(name,slug)").eq("workspace_id",workspaceId).not("status","in","(completed,cancelled,archived)").order("due_at",{ascending:true,nullsFirst:false}).limit(30),
    supabase.from("meetings").select("id,title,scheduled_at,participants,projects(name,slug)").eq("workspace_id",workspaceId).is("archived_at",null).gte("scheduled_at",now.toISOString()).lte("scheduled_at",horizon).order("scheduled_at").limit(20),
    supabase.from("financial_entries").select("id,description,status,amount_cents,due_at,projects(name,slug)").eq("workspace_id",workspaceId).eq("entry_type","income").not("status","in","(paid,cancelled)").order("due_at",{ascending:true,nullsFirst:false}).limit(20),
  ]);
  const failed = [tasksResult,meetingsResult,financeResult].find(result => result.error);
  if (failed) throw failed.error;
  const tasks = tasksResult.data || [], meetings = meetingsResult.data || [], finance = financeResult.data || [];
  const overdueTasks = tasks.filter(item => item.due_at && new Date(item.due_at) < now);
  const overdueFinance = finance.filter(item => item.due_at && new Date(item.due_at) < now);
  return <AppShell><div className="content"><div className="project-head"><div><div className="eyebrow">Central operacional</div><h1 className="page-title">Entrada e agenda</h1><p className="subtitle">O que exige sua ação agora e o que vem em seguida.</p></div><div className="actions"><Link className="btn" href="/app/reunioes/nova">Nova reunião</Link><Link className="btn primary" href="/app/tarefas/nova">Nova tarefa</Link></div></div><section className="metrics"><Metric label="Tarefas abertas" value={tasks.length}/><Metric label="Tarefas atrasadas" value={overdueTasks.length}/><Metric label="Reuniões em 14 dias" value={meetings.length}/><Metric label="Cobranças vencidas" value={overdueFinance.length}/></section><div className="dashboard-grid"><div style={{display:"grid",gap:20}}><List icon={AlertTriangle} title="Exige atenção" items={[...overdueTasks.map(x=>({...x,label:x.title,meta:`Tarefa atrasada · ${date(x.due_at)}`})),...overdueFinance.map(x=>({...x,label:x.description,meta:`Cobrança vencida · ${money(x.amount_cents)}`}))]}/><List icon={CheckSquare} title="Próximas tarefas" items={tasks.filter(x=>!overdueTasks.includes(x)).map(x=>({...x,label:x.title,meta:`${x.priority} · ${date(x.due_at)}`}))}/></div><List icon={CalendarDays} title="Agenda dos próximos 14 dias" items={meetings.map(x=>({...x,label:x.title,meta:`${date(x.scheduled_at)} · ${x.participants || "Participantes não informados"}`}))}/></div></div></AppShell>;
}

function List({icon:Icon,title,items}) { return <section className="panel"><div className="panel-head"><div className="panel-title"><Icon size={17}/> {title}</div><span className="badge">{items.length}</span></div>{items.length ? items.map(item => <Link className="item" href={item.projects?.slug ? `/app/projetos/${item.projects.slug}` : "/app/projetos"} key={`${title}-${item.id}`}><div className="item-main"><div className="item-title">{item.label}</div><div className="meta">{item.projects?.name || "Sem projeto"} · {item.meta}</div></div></Link>) : <div className="empty">Nada pendente nesta seção.</div>}</section> }
function Metric({label,value}) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono">{value}</div></div> }
function money(cents) { return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100) }
