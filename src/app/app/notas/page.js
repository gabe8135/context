import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NoteListRow } from "@/components/note-list-row";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";

export const dynamic = "force-dynamic";

export default async function Notes({ searchParams }) {
  const queryParams = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, queryParams.projeto);
  let query = supabase.from("notes").select("id,title,content,status,updated_at,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false });
  if (scope) query = query.eq("project_id", scope.id);
  const { data, error } = await query;
  if (error) throw error;
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className={`content notes-list-page ${scope ? "scoped-list-page" : ""}`}>
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Conhecimento geral"}</div><h1 className="page-title">Notas</h1><p className="subtitle">{scope ? "Somente notas deste projeto." : "Notas pessoais e de todos os projetos."}</p></div><Link className="btn primary" href={`/app/notas/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova nota</Link></div>
    {queryParams.sucesso && <p className="success-note">{queryParams.sucesso}</p>}{queryParams.erro && <p className="error">{queryParams.erro}</p>}
    <section className="panel data-panel notes-compact-list"><table><thead><tr><th>Nota</th><th>Contexto</th><th>Estado</th></tr></thead><tbody>{data.map((note) => <NoteListRow note={note} key={note.id}/>)}</tbody></table>{!data.length && <div className="empty">Nenhuma nota neste contexto.</div>}</section>
  </div></AppShell>;
}
