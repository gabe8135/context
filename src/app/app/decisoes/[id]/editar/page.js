import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveDecisionAction, updateDecisionAction } from "./actions";

const dateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default async function EditDecision({ params }) {
  const { id } = await params;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: decision, error } = await supabase.from("decisions").select("*,projects(id,name,slug,clients(name))").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const project = decision.projects;
  return <AppShell context={project ? { type: "project", ...project } : null}><div className="content narrow">
    <Link className="back-link" href={project ? `/app/projetos/${project.slug}` : "/app/decisoes"}>← {project ? project.name : "Decisões"}</Link><div className="eyebrow">Memória decisória</div><h1 className="page-title">Editar decisão</h1>
    <form className="panel form-panel" action={updateDecisionAction.bind(null, id)}><div className="form-grid"><label className="field full"><span>Título</span><input name="title" defaultValue={decision.title} required/></label><label className="field full"><span>Decisão</span><textarea name="content" rows="7" defaultValue={decision.content} required/></label><label className="field"><span>Responsável</span><input name="responsible_name" defaultValue={decision.responsible_name || ""}/></label><label className="field"><span>Data</span><input type="datetime-local" name="decided_at" defaultValue={dateTime(decision.decided_at)}/></label><label className="field"><span>Status</span><select name="status" defaultValue={decision.status}><option value="current">Atual</option><option value="pending_confirmation">Pendente</option><option value="superseded">Substituída</option><option value="cancelled">Cancelada</option></select></label><label className="field"><span>Motivo</span><textarea name="reason" rows="4" defaultValue={decision.reason || ""}/></label><label className="field"><span>Impacto</span><textarea name="impact" rows="4" defaultValue={decision.impact || ""}/></label></div><button className="btn primary">Salvar alterações</button></form>
    <form action={archiveDecisionAction.bind(null, id)}><button className="btn" style={{ marginTop: 12 }}>Arquivar decisão</button></form>
  </div></AppShell>;
}
