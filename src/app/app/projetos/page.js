import Link from "next/link";
import { Archive, FolderKanban, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireWorkspace } from "@/lib/auth-context";
import { calculateProjectProgress } from "@/lib/project-progress";
import { archiveProjectAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Projects({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase.from("projects").select("id,name,slug,status,priority,due_at,clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false });
  if (error) throw error;
  const projectIds = data.map((project) => project.id);
  const { data: projectTasks, error: tasksError } = projectIds.length
    ? await supabase.from("tasks").select("project_id,status").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null)
    : { data: [], error: null };
  if (tasksError) throw tasksError;
  const tasksByProject = (projectTasks || []).reduce((groups, task) => {
    (groups[task.project_id] ||= []).push(task);
    return groups;
  }, {});
  const projects = data.map((project) => ({
    ...project,
    progress: calculateProjectProgress(tasksByProject[project.id] || [], project.status),
  }));

  return <AppShell><div className="content projects-list-page">
    <div className="project-head">
      <div><div className="eyebrow">Operação</div><h1 className="page-title">Projetos</h1><p className="subtitle">Trabalho ativo, contexto e próximos passos por cliente.</p></div>
      <Link className="btn primary" href="/app/projetos/novo"><Plus size={15}/> Novo projeto</Link>
    </div>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    {!projects.length
      ? <section className="empty-state"><FolderKanban size={34}/><h2>Nenhum projeto ativo</h2><p>Crie um projeto novo ou consulte os projetos arquivados.</p><div className="actions"><Link className="btn primary" href="/app/projetos/novo">Criar projeto</Link><Link className="btn" href="/app/arquivados">Ver arquivados</Link></div></section>
      : <section className="panel data-panel projects-compact-list"><table>
        <thead><tr><th>Projeto</th><th>Cliente</th><th>Progresso</th><th>Prazo</th><th>Ações</th></tr></thead>
        <tbody>{projects.map((project) => <tr key={project.id}>
          <td data-label="Projeto"><b>{project.name}</b><div className="meta project-status-line">{project.status} · {project.priority}</div></td>
          <td data-label="Cliente">{project.clients?.name}</td>
          <td data-label="Progresso">
            <div className="desktop-project-progress"><div className="progress" style={{ width: 110 }}><i style={{ width: `${project.progress}%` }}/></div><div className="meta">{project.progress}%</div></div>
            <div className="mobile-progress-ring" style={{ "--progress": `${project.progress * 3.6}deg` }}><span>{project.progress}%</span></div>
          </td>
          <td data-label="Prazo">{project.due_at ? new Date(`${project.due_at}T12:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</td>
          <td data-label="Ações"><div className="table-actions">
            <Link className="btn" href={`/app/projetos/${project.slug}`}>Abrir</Link>
            <form action={archiveProjectAction.bind(null, project.id)}><ConfirmSubmitButton message={`Arquivar o projeto “${project.name}”? Os dados serão preservados.`}><Archive size={13}/> Arquivar</ConfirmSubmitButton></form>
          </div></td>
        </tr>)}</tbody>
      </table></section>}
  </div></AppShell>;
}
