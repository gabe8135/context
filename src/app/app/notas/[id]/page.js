import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveNoteAction, restoreNoteVersionAction, updateNoteAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NoteDetail({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data: note, error }, { data: versions }] = await Promise.all([
    supabase.from("notes").select("*,projects(id,name,slug,clients(name))").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase.from("note_versions").select("id,version,title,content,created_at").eq("note_id", id).eq("workspace_id", workspaceId).order("version", { ascending: false })
  ]);
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const project = note.projects;
  const context = project ? { type: "project", ...project } : null;
  const backHref = project ? `/app/projetos/${project.slug}` : "/app/notas";
  return <AppShell context={context}><div className="content narrow">
    <Link className="back-link" href={backHref}>← {project ? project.name : "Notas"}</Link>
    <div className="eyebrow">Memória versionada · versão {note.version}</div><h1 className="page-title">Editar nota</h1>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <form action={updateNoteAction.bind(null, id)} className="panel form-panel"><div className="form-grid"><label className="field"><span>Estado</span><select name="status" defaultValue={note.status}><option value="active">Atual</option><option value="historical">Histórica</option></select></label><label className="field full"><span>Título</span><input name="title" defaultValue={note.title} required/></label><label className="field full"><span>Conteúdo</span><textarea name="content" rows="15" defaultValue={note.content} required/><small>Aceita Markdown: títulos, listas, links, negrito e checklists.</small></label></div><button className="btn primary">Salvar nova versão</button></form>
    {versions?.length > 0 && <section className="panel" style={{ marginTop: 16 }}><header className="panel-head"><div className="panel-title">Histórico de versões</div><span className="badge">{versions.length}</span></header>{versions.map((version) => <div className="item" key={version.id}><div className="item-main"><b>Versão {version.version} · {version.title}</b><div className="meta">{new Date(version.created_at).toLocaleString("pt-BR")} · {version.content.slice(0, 100)}</div></div><form action={restoreNoteVersionAction.bind(null, id, version.id)}><button className="btn">Restaurar</button></form></div>)}</section>}
    <form action={archiveNoteAction.bind(null, id)}><button className="btn" style={{ marginTop: 12 }}>Arquivar nota</button></form>
  </div></AppShell>;
}
