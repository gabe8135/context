import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveTaskAction, updateTaskAction } from "../actions";

export const dynamic = "force-dynamic";
const dateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default async function TaskDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data: task, error }, { data: projects }] = await Promise.all([
    supabase.from("tasks").select("*,projects(id,name,slug,clients(name))").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase.from("projects").select("id,name").eq("workspace_id", workspaceId).is("archived_at", null).order("name")
  ]);
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const project = task.projects;
  return <AppShell context={project ? { type: "project", ...project } : null}><div className="content narrow">
    <Link className="back-link" href={project ? `/app/projetos/${project.slug}` : "/app/tarefas"}>← {project ? project.name : "Tarefas"}</Link>
    <div className="eyebrow">Execução</div><h1 className="page-title">Editar tarefa</h1>{query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <form action={updateTaskAction.bind(null, id)} className="panel form-panel"><div className="form-grid"><label className="field"><span>Projeto</span><select name="project_id" defaultValue={task.project_id}>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field name="title" label="Título" value={task.title} required/><label className="field"><span>Status</span><select name="status" defaultValue={task.status}>{[["todo", "A fazer"], ["in_progress", "Em andamento"], ["waiting_client", "Aguardando cliente"], ["waiting_third_party", "Aguardando terceiro"], ["blocked", "Bloqueada"], ["review", "Em revisão"], ["completed", "Concluída"], ["cancelled", "Cancelada"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field"><span>Prioridade</span><select name="priority" defaultValue={task.priority}>{["low", "medium", "high", "urgent"].map((value) => <option key={value}>{value}</option>)}</select></label><Field name="starts_at" label="Início" type="datetime-local" value={dateTime(task.starts_at)}/><Field name="due_at" label="Prazo" type="datetime-local" value={dateTime(task.due_at)}/><Field name="next_action" label="Próxima ação" value={task.next_action || ""} full/><label className="field full"><span>Descrição</span><textarea name="description" rows="6" defaultValue={task.description || ""}/></label></div><div className="form-actions"><button className="btn primary">Salvar alterações</button></div></form>
    <form action={archiveTaskAction.bind(null, id, "")}><button className="btn" style={{ marginTop: 12 }}>Arquivar tarefa</button></form>
  </div></AppShell>;
}

function Field({ name, label, value, type = "text", required = false, full = false }) {
  return <label className={`field${full ? " full" : ""}`}><span>{label}</span><input name={name} type={type} defaultValue={value} required={required}/></label>;
}
