import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, FolderKanban, Mail, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { calculateProjectProgress } from "@/lib/project-progress";
import { archiveClientAction } from "../actions";

export default async function ClientDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: client, error } = await supabase.from("clients").select("*,projects(id,name,slug,status,last_activity_at)").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const projectIds = (client.projects || []).map((project) => project.id);
  const { data: projectTasks, error: tasksError } = projectIds.length
    ? await supabase.from("tasks").select("project_id,status").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null)
    : { data: [], error: null };
  if (tasksError) throw tasksError;
  const tasksByProject = (projectTasks || []).reduce((groups, task) => {
    (groups[task.project_id] ||= []).push(task);
    return groups;
  }, {});
  const projects = (client.projects || []).map((project) => ({
    ...project,
    progress: calculateProjectProgress(tasksByProject[project.id] || [], project.status),
  })).sort((a, b) => new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0));
  const archive = archiveClientAction.bind(null, id);
  return <AppShell context={{ type: "client", ...client, projects }}><div className="content client-folder-page">
    <header className="client-folder-head"><div><div className="eyebrow">Pasta do cliente</div><h1 className="page-title">{client.name}</h1><p className="subtitle">Tudo que pertence a este cliente começa pelos projetos.</p></div><div className="actions"><Link className="btn" href={`/app/clientes/${id}/editar`}><Pencil size={14}/> Editar</Link><form action={archive}><button className="btn" type="submit"><Archive size={14}/> Arquivar</button></form></div></header>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <section className="client-contact-strip"><Contact icon={Mail} label="E-mail" value={client.email}/><Contact icon={Phone} label="Telefone" value={client.phone}/><Contact icon={MessageCircle} label="WhatsApp" value={client.whatsapp}/></section>
    <section className="client-project-folder"><div className="section-heading"><div><span className="eyebrow">Conteúdo da pasta</span><h2>Projetos</h2></div><Link className="btn primary" href={`/app/projetos/novo?cliente=${id}`}><Plus size={15}/> Novo projeto</Link></div><div className="project-folder-grid">{projects.map((project) => <Link className="project-folder-card" href={`/app/projetos/${project.slug}`} key={project.id}><span className="folder-card-icon"><FolderKanban size={19}/></span><div><b>{project.name}</b><span>{project.status === "active" ? "Projeto ativo" : project.status}</span></div><div className="folder-progress"><i style={{ width: `${project.progress || 0}%` }}/></div><small>{project.progress || 0}% concluído</small></Link>)}{!projects.length && <div className="empty-state-card">Esta pasta ainda não possui projetos.</div>}</div></section>
    {client.notes && <section className="client-folder-note"><span className="eyebrow">Sobre o cliente</span><p>{client.notes}</p></section>}
  </div></AppShell>;
}

function Contact({ icon: Icon, label, value }) { return <div><Icon size={16}/><span><small>{label}</small><b>{value || "Não informado"}</b></span></div>; }
