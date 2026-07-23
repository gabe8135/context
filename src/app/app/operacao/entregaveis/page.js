import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";
import { STATUS_LABELS, statusLabel } from "@/lib/status-labels";
import { updateDeliverableAction } from "./actions";

const deliverableStatuses = ["planned", "in_production", "review", "sent", "approved", "adjustment_requested", "completed", "cancelled"];
export default async function Deliverables({ searchParams }) {
  const q = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  let projectId = null;
  if (q.projeto) {
    const { data } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).eq("slug", q.projeto).maybeSingle();
    projectId = data?.id;
  }
  let query = supabase.from("deliverables").select("id,name,quantity,status,due_at,notes,final_file_id,projects(name,slug)").eq("workspace_id", workspaceId).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false });
  if (projectId) query = query.eq("project_id", projectId);
  const [{ data, error }, { data: files }] = await Promise.all([query, supabase.from("files").select("id,logical_name,version,project_id").eq("workspace_id", workspaceId).eq("is_current", true).is("archived_at", null)]);
  if (error) throw error;
  return <AppShell><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">Produção e entrega</div><h1 className="page-title">Entregáveis</h1></div><Link className="btn primary" href={`/app/operacao/entregaveis/novo${q.projeto ? `?projeto=${q.projeto}` : ""}`}><Plus size={15}/> Novo entregável</Link></div>
    <section className="panel uniform-item-list" style={{ marginTop: 24 }}>{data.map((item) => <div className="item" key={item.id}><div className="item-main">
      <RecordDetailsButton label="Detalhes do entregável" title={item.name} summary={`${item.quantity} un. · ${statusLabel(item.status)}`} details={[
        { label: "Projeto", value: item.projects?.name }, { label: "Quantidade", value: item.quantity },
        { label: "Status", value: statusLabel(item.status) }, { label: "Prazo", value: item.due_at ? new Date(item.due_at).toLocaleString("pt-BR") : "Sem prazo" }
      ]} sections={[{ label: "Observações", content: item.notes }]}>
        <form className="modal-inline-form" action={updateDeliverableAction.bind(null, item.id)}>
          <label>Status<select name="status" defaultValue={item.status}>{deliverableStatuses.map((value) => <option value={value} key={value}>{STATUS_LABELS[value]}</option>)}</select></label>
          <label>Arquivo final<select name="final_file_id" defaultValue={item.final_file_id || ""}><option value="">Sem arquivo final</option>{files?.filter((file) => file.project_id === projectId || !projectId).map((file) => <option value={file.id} key={file.id}>{file.logical_name} v{file.version}</option>)}</select></label>
          <button className="btn primary">Salvar</button>
        </form>
      </RecordDetailsButton>
    </div></div>)}{!data.length && <div className="empty">Nenhum entregável.</div>}</section>
  </div></AppShell>;
}
