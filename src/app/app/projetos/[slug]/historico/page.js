import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";

export const dynamic = "force-dynamic";
export default async function History({ params }) {
  const { slug } = await params;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: project, error } = await supabase.from("projects").select("id,name,slug,clients(name)").eq("slug", slug).eq("workspace_id", workspaceId).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const { data: activities, error: activitiesError } = await supabase.from("activities").select("id,type,description,actor_name,created_at").eq("project_id", project.id).eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (activitiesError) throw activitiesError;
  return <AppShell context={{ type: "project", ...project }}><div className="content narrow uniform-list-page">
    <Link className="back-link" href={`/app/projetos/${slug}`}>← {project.name}</Link><div className="eyebrow">Linha do tempo</div><h1 className="page-title">Histórico do projeto</h1><p className="subtitle">Tudo o que aconteceu, do evento mais recente ao mais antigo.</p>
    <section className="panel timeline uniform-item-list" style={{ marginTop: 24 }}>{activities.length ? activities.map((activity) => <div className="timeline-item" key={activity.id}><span className="timeline-marker"/><div className="item-main"><RecordDetailsButton label="Evento do histórico" title={activity.description} summary={`${activity.actor_name || "Sistema"} · ${new Date(activity.created_at).toLocaleString("pt-BR")}`} details={[
      { label: "Responsável", value: activity.actor_name || "Sistema" }, { label: "Tipo", value: activity.type }, { label: "Data e hora", value: new Date(activity.created_at).toLocaleString("pt-BR") }
    ]} sections={[{ label: "Descrição completa", content: activity.description }]}/></div></div>) : <div className="empty">Nenhuma atividade registrada.</div>}</section>
  </div></AppShell>;
}
