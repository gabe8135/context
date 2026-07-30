import Link from "next/link";
import { CalendarDays, CheckSquare2, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WeekTaskList } from "@/components/week-task-list";
import { requireWorkspace } from "@/lib/auth-context";
import { attachTaskDependencies, buildNarrativeSummary, chooseCurrentFocus } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function MyWeek() {
  const { supabase, workspaceId } = await requireWorkspace();
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  const weekAgo = new Date(from);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [taskResult, eventResult, activityResult] = await Promise.all([
    supabase.from("tasks")
      .select("id,title,description,next_action,status,priority,starts_at,due_at,created_at,completed_at,queue_position,project_id,depends_on_task_id,projects(name,slug)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .not("status", "in", "(completed,cancelled,archived)")
      .or(`due_at.is.null,due_at.lt.${to.toISOString()}`)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("queue_position", { ascending: true, nullsFirst: false }),
    supabase.from("calendar_events").select("id,title,starts_at,event_type,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at"),
    supabase.from("activities").select("type,created_at").eq("workspace_id", workspaceId).gte("created_at", weekAgo.toISOString()).order("created_at", { ascending: false }),
  ]);

  const error = taskResult.error || eventResult.error || activityResult.error;
  if (error) throw error;
  const tasks = await attachTaskDependencies(supabase, taskResult.data || []);
  const focus = chooseCurrentFocus(tasks);
  const narrative = buildNarrativeSummary({ activities: activityResult.data || [], tasks, from: weekAgo, to: from });

  return <AppShell><div className="content week-page">
    <div className="eyebrow">Próximos sete dias</div>
    <h1 className="page-title">Minha semana</h1>
    <p className="subtitle">Um plano único, atravessando sua agenda pessoal e todos os projetos.</p>
    {focus && <section className="daily-focus-card"><Target size={22}/><div><span className="eyebrow">Prioridade atual</span><h2>{focus.title}</h2><p>{focus.projects?.name || "Pessoal"}</p></div><Link className="btn primary" href={`/app/tarefas/${focus.id}`}>Trabalhar agora</Link></section>}
    <section className="panel narrative-card"><header className="panel-head"><div className="panel-title">Resumo da semana anterior</div></header><p>{narrative}</p></section>
    <div className="week-grid">
      <section className="panel"><header className="panel-head"><div className="panel-title"><CheckSquare2 size={18}/> Tarefas</div><span className="badge">{tasks.length}</span></header><WeekTaskList tasks={tasks}/></section>
      <section className="panel"><header className="panel-head"><div className="panel-title"><CalendarDays size={18}/> Compromissos</div><span className="badge">{eventResult.data?.length || 0}</span></header>{eventResult.data?.map((event) => <Link className="week-row" href={`/app/agenda${event.projects?.slug ? `?projeto=${event.projects.slug}` : ""}`} key={event.id}><div><b>{event.title}</b><span>{event.projects?.name || "Pessoal"} · {event.event_type}</span></div><time>{new Date(event.starts_at).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></Link>)}</section>
    </div>
  </div></AppShell>;
}
