import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";

export default async function Decisions({ searchParams }) {
  const queryParams = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, queryParams.projeto);
  let query = supabase.from("decisions").select("id,title,content,status,decided_at,responsible_name,projects(name,slug),clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("decided_at", { ascending: false });
  if (scope) query = query.eq("project_id", scope.id);
  const { data, error } = await query;
  if (error) throw error;
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className="content">
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Memória preservada"}</div><h1 className="page-title">Decisões</h1><p className="subtitle">{scope ? "Somente decisões deste projeto." : "Edite ou arquive decisões sem apagar o histórico de atividades."}</p></div><Link className="btn primary" href={`/app/decisoes/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova decisão</Link></div>
    <section className="panel data-panel" style={{ marginTop: 24 }}><table><thead><tr><th>Decisão</th><th>Projeto</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead><tbody>{data.map((decision) => <tr key={decision.id}><td><b>{decision.title}</b><div className="meta">{decision.content.slice(0, 100)}</div></td><td><Link href={`/app/projetos/${decision.projects?.slug}`}>{decision.projects?.name}</Link></td><td><span className="badge">{decision.status}</span></td><td>{new Date(decision.decided_at).toLocaleDateString("pt-BR")}</td><td><Link className="btn" href={`/app/decisoes/${decision.id}/editar`}><Pencil size={13}/> Editar</Link></td></tr>)}</tbody></table>{!data.length && <div className="empty">Nenhuma decisão neste projeto.</div>}</section>
  </div></AppShell>;
}
