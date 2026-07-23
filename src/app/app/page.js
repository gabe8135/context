import Link from "next/link";
import { AlertTriangle, CalendarCheck, CheckSquare2, FolderKanban, Plus, Square, StickyNote } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NaturalCapture } from "@/components/natural-capture";
import { requireWorkspace } from "@/lib/auth-context";
import { getActiveContextIds } from "@/lib/active-context";
import { calculateProjectProgress } from "@/lib/project-progress";
import { toggleTaskAction } from "./tarefas/actions";

export const dynamic = "force-dynamic";

export default async function Overview({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { projectIds } = await getActiveContextIds(supabase, workspaceId);
  const empty = Promise.resolve({ data: [], error: null });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const [projects, tasks, projectTasks, personalNotes] = await Promise.all([
    projectIds.length ? supabase.from("projects").select("id,name,slug,status,last_activity_at,clients(name)").eq("workspace_id", workspaceId).in("id", projectIds).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(6) : empty,
    supabase.from("tasks").select("id,title,due_at,status,priority,project_id,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).not("status", "in", "(completed,cancelled,archived)").order("due_at", { ascending: true, nullsFirst: false }).limit(80),
    projectIds.length ? supabase.from("tasks").select("project_id,status").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).not("status", "in", "(cancelled,archived)") : empty,
    supabase.from("notes").select("id,title,content,updated_at").eq("workspace_id", workspaceId).is("project_id", null).is("archived_at", null).order("updated_at", { ascending: false }).limit(5),
  ]);
  if (projects.error || tasks.error || projectTasks.error || personalNotes.error) throw projects.error || tasks.error || projectTasks.error || personalNotes.error;
  const activeProjectIds = new Set(projectIds);
  const rows = (tasks.data || []).filter((task) => !task.project_id || activeProjectIds.has(task.project_id));
  const personalTasks = rows.filter((task) => !task.project_id);
  const tasksByProject = (projectTasks.data || []).reduce((groups, task) => { (groups[task.project_id] ||= []).push(task); return groups; }, {});
  const recentProjects = (projects.data || []).map((project) => ({ ...project, progress: calculateProjectProgress(tasksByProject[project.id] || [], project.status) }));
  const today = rows.filter((task) => task.due_at && new Date(task.due_at) >= todayStart && new Date(task.due_at) < tomorrow);
  const overdue = rows.filter((task) => task.due_at && new Date(task.due_at) < todayStart);

  return <AppShell><div className="content workspace-home">
    <header className="home-welcome"><div><div className="eyebrow">Seu espaço de trabalho</div><h1 className="page-title">O que precisa da sua atenção?</h1><p className="subtitle">Comece pelo que importa. O restante continua guardado no contexto certo.</p></div></header>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <NaturalCapture/>
    {(today.length > 0 || overdue.length > 0) && <div className={`home-focus-grid ${!today.length || !overdue.length ? "single" : ""}`}>
      {today.length > 0 && <FocusList icon={CalendarCheck} title="Hoje" rows={today}/>}
      {overdue.length > 0 && <FocusList icon={AlertTriangle} title="Atrasados" rows={overdue} danger/>}
    </div>}
    <section className="personal-agenda-section">
      <div className="section-heading"><div><span className="eyebrow">Fora dos projetos</span><h2>Minha agenda pessoal</h2><p>Afazeres e lembretes do dia a dia ficam aqui, sem poluir nenhum projeto.</p></div><div className="personal-agenda-actions"><Link className="btn primary" href="/app/tarefas/nova"><Plus size={15}/> Tarefa pessoal</Link><Link className="btn" href="/app/notas/nova"><Plus size={15}/> Nota pessoal</Link></div></div>
      <div className="personal-agenda-grid">
        <PersonalList icon={CheckSquare2} title="Afazeres pessoais" rows={personalTasks} type="task" empty="Nenhum afazer pessoal em aberto."/>
        <PersonalList icon={StickyNote} title="Notas pessoais" rows={personalNotes.data || []} type="note" empty="Nenhuma nota pessoal registrada."/>
      </div>
    </section>
    <section className="recent-projects-section">
      <div className="section-heading"><div><span className="eyebrow">Continue de onde parou</span><h2>Projetos recentes</h2></div><Link className="btn" href="/app/projetos">Ver todos</Link></div>
      <div className="project-folder-grid">{recentProjects.map((project) => <Link className="project-folder-card" href={`/app/projetos/${project.slug}`} key={project.id}><span className="folder-card-icon"><FolderKanban size={19}/></span><div><b>{project.name}</b><span>{project.clients?.name || "Sem cliente"}</span></div><div className="folder-progress"><i style={{ width: `${project.progress}%` }}/></div><small>{project.progress}% concluído</small></Link>)}{!recentProjects.length && <div className="empty-state-card">Nenhum projeto ativo. <Link href="/app/projetos/novo">Crie o primeiro projeto</Link>.</div>}</div>
    </section>
  </div></AppShell>;
}

function FocusList({ icon: Icon, title, rows, danger = false }) {
  return <section className={`focus-list ${danger ? "danger" : ""}`}><header><div><Icon size={18}/><h2>{title}</h2></div><span className="badge">{rows.length}</span></header><div>{rows.slice(0, 7).map((task) => <TaskTodoRow task={task} key={task.id}/>)}</div></section>;
}

function PersonalList({ icon: Icon, title, rows, type, empty }) {
  return <section className="personal-agenda-card"><header><div><Icon size={18}/><h3>{title}</h3></div><span className="badge">{rows.length}</span></header><div>{rows.length ? rows.slice(0, 5).map((item) => type === "task" ? <TaskTodoRow task={item} compact key={item.id}/> : <Link className="personal-agenda-item" href={`/app/notas/${item.id}`} key={item.id}><b>{item.title}</b><span>{item.content.slice(0, 100)}</span></Link>) : <p className="focus-empty">{empty}</p>}</div><Link className="personal-list-link" href={`/app/${type === "task" ? "tarefas" : "notas"}`}>Ver tudo</Link></section>;
}

function TaskTodoRow({ task, compact = false }) {
  const projectSlug = task.projects?.slug || "";
  return <div className={`todo-row ${compact ? "compact" : ""}`}>
    <form action={toggleTaskAction.bind(null, task.id, task.project_id, projectSlug)}><button className="todo-check" title={`Concluir ${task.title}`} aria-label={`Marcar ${task.title} como concluída`}><Square size={18}/></button></form>
    <Link className="todo-content" href={`/app/tarefas/${task.id}`}><b>{task.title}</b><span>{task.projects?.name || "Pessoal"} · {task.priority}</span></Link>
    {task.due_at && <time>{new Date(task.due_at).toLocaleDateString("pt-BR", compact ? { day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "short" })}</time>}
  </div>;
}
