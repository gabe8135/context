import Link from "next/link";
import { AlertTriangle, CalendarCheck, FolderKanban } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NaturalCapture } from "@/components/natural-capture";
import { requireWorkspace } from "@/lib/auth-context";
import { getActiveContextIds } from "@/lib/active-context";
import { calculateProjectProgress } from "@/lib/project-progress";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const { supabase, workspaceId } = await requireWorkspace();
  const { projectIds } = await getActiveContextIds(supabase, workspaceId);
  const empty = Promise.resolve({ data: [], error: null });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const [projects, tasks, projectTasks] = await Promise.all([
    projectIds.length ? supabase.from("projects").select("id,name,slug,status,progress,last_activity_at,clients(name)").eq("workspace_id", workspaceId).in("id", projectIds).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(6) : empty,
    projectIds.length ? supabase.from("tasks").select("id,title,due_at,status,priority,projects(name,slug)").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).not("status", "in", "(completed,cancelled,archived)").order("due_at", { ascending: true, nullsFirst: false }).limit(30) : empty,
    projectIds.length ? supabase.from("tasks").select("project_id,status").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).not("status", "in", "(cancelled,archived)") : empty,
  ]);
  if (projects.error || tasks.error || projectTasks.error) throw projects.error || tasks.error || projectTasks.error;
  const rows = tasks.data || [];
  const tasksByProject = (projectTasks.data || []).reduce((groups, task) => {
    (groups[task.project_id] ||= []).push(task);
    return groups;
  }, {});
  const recentProjects = (projects.data || []).map((project) => ({
    ...project,
    progress: calculateProjectProgress(tasksByProject[project.id] || [], project.status),
  }));
  const today = rows.filter((task) => task.due_at && new Date(task.due_at) >= todayStart && new Date(task.due_at) < tomorrow);
  const overdue = rows.filter((task) => task.due_at && new Date(task.due_at) < todayStart);

  return <AppShell><div className="content workspace-home">
    <header className="home-welcome"><div><div className="eyebrow">Seu espaço de trabalho</div><h1 className="page-title">O que precisa da sua atenção?</h1><p className="subtitle">Comece pelo que importa. O restante continua guardado no contexto certo.</p></div></header>
    <NaturalCapture/>
    <div className="home-focus-grid">
      <FocusList icon={CalendarCheck} title="Hoje" rows={today} empty="Nenhuma tarefa para hoje."/>
      <FocusList icon={AlertTriangle} title="Atrasados" rows={overdue} empty="Nada atrasado. Ótimo ritmo." danger/>
    </div>
    <section className="recent-projects-section">
      <div className="section-heading"><div><span className="eyebrow">Continue de onde parou</span><h2>Projetos recentes</h2></div><Link className="btn" href="/app/projetos">Ver todos</Link></div>
      <div className="project-folder-grid">{recentProjects.map((project) => <Link className="project-folder-card" href={`/app/projetos/${project.slug}`} key={project.id}><span className="folder-card-icon"><FolderKanban size={19}/></span><div><b>{project.name}</b><span>{project.clients?.name || "Sem cliente"}</span></div><div className="folder-progress"><i style={{ width: `${project.progress}%` }}/></div><small>{project.progress}% concluído</small></Link>)}{!recentProjects.length && <div className="empty-state-card">Nenhum projeto ativo. <Link href="/app/projetos/novo">Crie o primeiro projeto</Link>.</div>}</div>
    </section>
  </div></AppShell>;
}

function FocusList({ icon: Icon, title, rows, empty, danger = false }) {
  return <section className={`focus-list ${danger ? "danger" : ""}`}><header><div><Icon size={18}/><h2>{title}</h2></div><span className="badge">{rows.length}</span></header><div>{rows.length ? rows.slice(0, 7).map((task) => <Link className="focus-task" href={`/app/tarefas/${task.id}`} key={task.id}><div><b>{task.title}</b><span>{task.projects?.name || "Sem projeto"} · {task.priority}</span></div>{task.due_at && <time>{new Date(task.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</time>}</Link>) : <p className="focus-empty">{empty}</p>}</div></section>;
}
