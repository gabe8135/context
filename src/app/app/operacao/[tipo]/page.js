import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";
import { operationalModules } from "@/lib/operational-modules";
import { archiveOperationalAction, classifyInboxAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function OperationalList({ params, searchParams }) {
  const { tipo } = await params;
  const q = await searchParams;
  const cfg = operationalModules[tipo];
  if (!cfg) notFound();
  const { supabase, workspaceId } = await requireWorkspace();
  let projectId = null;
  if (q.projeto) {
    const { data } = await supabase.from("projects").select("id").eq("slug", q.projeto).eq("workspace_id", workspaceId).maybeSingle();
    projectId = data?.id || null;
  }
  let query = supabase.from(cfg.table).select(cfg.select).eq("workspace_id", workspaceId).is("archived_at", null).order("created_at", { ascending: false }).limit(100);
  if (projectId) query = query.eq("project_id", projectId);
  const { data, error } = await query;
  if (error) throw error;

  return <AppShell><div className="content uniform-list-page">
    <div className="project-head"><div><div className="eyebrow">Contexto estruturado</div><h1 className="page-title">{cfg.title}</h1>{q.projeto && <p className="subtitle">Projeto: {q.projeto.replaceAll("-", " ")}</p>}</div><Link className="btn primary" href={`/app/operacao/${tipo}/novo${q.projeto ? `?projeto=${q.projeto}` : ""}`}><Plus size={15}/> Adicionar {cfg.singular}</Link></div>
    {q.sucesso && <p className="success-note">{q.sucesso}</p>}{q.erro && <p className="error">{q.erro}</p>}
    <section className="panel uniform-item-list" style={{ marginTop: 24 }}>{data.length ? data.map((item) => <div className="item" key={item.id}>
      <div className="item-main"><RecordDetailsButton label={cfg.singular} title={item[cfg.name]} summary={`${item.projects?.name || "Sem projeto"} · ${item.status || item.category || `versão ${item.version || 1}`}`} details={[
        { label: "Projeto", value: item.projects?.name || "Sem projeto" }, { label: "Status", value: item.status },
        { label: "Categoria", value: item.category }, { label: "Versão", value: item.version },
        { label: "Atualizado", value: item.updated_at ? new Date(item.updated_at).toLocaleString("pt-BR") : null }
      ]} editHref={tipo !== "entrada" ? `/app/operacao/${tipo}/${item.id}/editar` : null} primaryHref={item.access_url} primaryLabel="Abrir site">
        {tipo === "entrada" && item.status === "unclassified" && <><form action={classifyInboxAction.bind(null, item.id, "task")}><button className="btn">Virar tarefa</button></form><form action={classifyInboxAction.bind(null, item.id, "note")}><button className="btn">Virar nota</button></form></>}
        <form action={archiveOperationalAction.bind(null, tipo, item.id)}><button className="btn">Arquivar</button></form>
      </RecordDetailsButton></div>
    </div>) : <div className="empty">Nenhum registro. Crie o primeiro item.</div>}</section>
  </div></AppShell>;
}
