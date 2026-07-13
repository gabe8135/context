import Link from "next/link";
import { Archive, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";
import { archiveNoteAction, deleteNoteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Notes({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, q.projeto);
  let query = supabase.from("notes").select("id,title,content,status,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false });
  if (scope) query = query.eq("project_id", scope.id);
  const { data, error } = await query;
  if (error) throw error;
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className="content">
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Conhecimento geral"}</div><h1 className="page-title">Notas</h1><p className="subtitle">{scope ? "Somente notas deste projeto." : "Notas de todos os projetos do workspace."}</p></div><Link className="btn primary" href={`/app/notas/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova nota</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}{q.erro && <p className="error">{q.erro}</p>}
    <section className="panel data-panel"><table><thead><tr><th>Nota</th><th>Projeto</th><th>Estado</th><th>Ações</th></tr></thead><tbody>{data.map((note) => <tr key={note.id}><td><Link href={`/app/notas/${note.id}`}><b>{note.title}</b></Link><div className="meta">{note.content.slice(0, 120)}</div></td><td>{note.projects?.name}</td><td><span className="badge">{note.status}</span></td><td><div className="table-actions"><Link className="btn compact-action" href={`/app/notas/${note.id}`} title="Editar"><Pencil size={14}/><span>Editar</span></Link><form action={archiveNoteAction.bind(null, note.id)}><ConfirmSubmitButton className="btn compact-action" message={`Arquivar a nota “${note.title}”?`}><Archive size={14}/><span>Arquivar</span></ConfirmSubmitButton></form><form action={deleteNoteAction.bind(null, note.id, scope?.slug || note.projects?.slug || "")}><ConfirmSubmitButton className="btn danger compact-action" message={`Excluir definitivamente a nota “${note.title}” e suas versões? Esta ação não pode ser desfeita.`}><Trash2 size={14}/><span>Excluir</span></ConfirmSubmitButton></form></div></td></tr>)}</tbody></table>{!data.length && <div className="empty">Nenhuma nota neste contexto.</div>}</section>
  </div></AppShell>;
}
