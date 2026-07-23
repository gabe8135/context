import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RecordDetailsButton } from "@/components/record-details-button";
import { StatusBadge } from "@/components/status-badge";
import { requireWorkspace } from "@/lib/auth-context";
import { resolveProjectScope } from "@/lib/project-scope";
import { statusLabel } from "@/lib/status-labels";
import { archiveDecisionAction } from "./[id]/editar/actions";

export default async function Decisions({ searchParams }) {
  const queryParams = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const scope = await resolveProjectScope(supabase, workspaceId, queryParams.projeto);
  let query = supabase.from("decisions").select("id,title,content,status,decided_at,responsible_name,projects(name,slug),clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("decided_at", { ascending: false });
  if (scope) query = query.eq("project_id", scope.id);
  const { data, error } = await query;
  if (error) throw error;
  return <AppShell context={scope ? { type: "project", ...scope } : null}><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">{scope ? `Projeto · ${scope.name}` : "Memória preservada"}</div><h1 className="page-title">Decisões</h1><p className="subtitle">{scope ? "Somente decisões deste projeto." : "Edite ou arquive decisões sem apagar o histórico de atividades."}</p></div><Link className="btn primary" href={`/app/decisoes/nova${scope ? `?projeto=${scope.slug}` : ""}`}><Plus size={15}/> Nova decisão</Link></div>
    <section className="panel data-panel uniform-compact-list" style={{ marginTop: 24 }}><table><thead><tr><th>Decisão</th><th>Projeto</th><th>Status</th><th>Data</th></tr></thead><tbody>{data.map((decision) => <tr key={decision.id}><td data-label="Decisão"><RecordDetailsButton label="Detalhes da decisão" title={decision.title} summary={decision.content.slice(0, 100)} details={[{label:"Projeto",value:decision.projects?.name},{label:"Status",value:statusLabel(decision.status)},{label:"Responsável",value:decision.responsible_name},{label:"Data",value:new Date(decision.decided_at).toLocaleDateString("pt-BR")}]} sections={[{label:"Decisão",content:decision.content}]} editHref={`/app/decisoes/${decision.id}/editar`}><form action={archiveDecisionAction.bind(null,decision.id)}><ConfirmSubmitButton message={`Arquivar a decisão “${decision.title}”?`}>Arquivar</ConfirmSubmitButton></form></RecordDetailsButton></td><td data-label="Projeto">{decision.projects?.name}</td><td data-label="Status"><StatusBadge status={decision.status}/></td><td data-label="Data">{new Date(decision.decided_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table>{!data.length && <div className="empty">Nenhuma decisão neste projeto.</div>}</section>
  </div></AppShell>;
}
