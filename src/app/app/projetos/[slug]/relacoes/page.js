import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RecordDetailsButton } from "@/components/record-details-button";
import { requireWorkspace } from "@/lib/auth-context";
import { createRelationAction, removeRelationAction } from "./actions";

const relationLabels = { related: "Relacionado", depends_on: "Depende de", blocks: "Bloqueia", supports: "Dá suporte" };
export default async function Relations({ params }) {
  const { slug } = await params;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: project, error } = await supabase.from("projects").select("id,name,slug,clients(name)").eq("slug", slug).eq("workspace_id", workspaceId).single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  const [{ data: relations }, { data: projects }, { data: tasks }, { data: notes }] = await Promise.all([
    supabase.from("entity_relations").select("*").eq("workspace_id", workspaceId).eq("source_type", "project").eq("source_id", project.id).order("created_at", { ascending: false }),
    supabase.from("projects").select("id,name").eq("workspace_id", workspaceId).neq("id", project.id).is("archived_at", null),
    supabase.from("tasks").select("id,title").eq("workspace_id", workspaceId).is("archived_at", null).limit(100),
    supabase.from("notes").select("id,title").eq("workspace_id", workspaceId).is("archived_at", null).limit(100)
  ]);
  const labels = new Map([...projects.map((item) => [`project:${item.id}`, item.name]), ...tasks.map((item) => [`task:${item.id}`, item.title]), ...notes.map((item) => [`note:${item.id}`, item.title])]);
  return <AppShell context={{ type: "project", ...project }}><div className="content narrow uniform-list-page">
    <Link className="back-link" href={`/app/projetos/${slug}`}>← {project.name}</Link><div className="eyebrow">Contexto conectado</div><h1 className="page-title">Relações</h1>
    <form className="panel form-panel" action={createRelationAction.bind(null, project.id, slug)}><div className="form-grid"><label className="field"><span>Relacionar com</span><select name="target" required><option value="">Selecione</option><optgroup label="Projetos">{projects.map((item) => <option key={item.id} value={`project:${item.id}`}>{item.name}</option>)}</optgroup><optgroup label="Tarefas">{tasks.map((item) => <option key={item.id} value={`task:${item.id}`}>{item.title}</option>)}</optgroup><optgroup label="Notas">{notes.map((item) => <option key={item.id} value={`note:${item.id}`}>{item.title}</option>)}</optgroup></select></label><label className="field"><span>Relação</span><select name="relation_type">{Object.entries(relationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field full"><span>Observação</span><input name="label"/></label></div><button className="btn primary">Criar relação</button></form>
    <section className="panel uniform-item-list" style={{ marginTop: 16 }}>{relations.map((relation) => {
      const title = labels.get(`${relation.target_type}:${relation.target_id}`) || "Item relacionado";
      return <div className="item" key={relation.id}><div className="item-main"><RecordDetailsButton label="Detalhes da relação" title={title} summary={relationLabels[relation.relation_type] || relation.relation_type} details={[
        { label: "Relação", value: relationLabels[relation.relation_type] || relation.relation_type }, { label: "Tipo do item", value: relation.target_type }
      ]} sections={[{ label: "Observação", content: relation.label }]}>
        <form action={removeRelationAction.bind(null, relation.id, slug)}><button className="btn danger">Remover relação</button></form>
      </RecordDetailsButton></div></div>;
    })}{!relations.length && <div className="empty">Nenhuma relação criada.</div>}</section>
  </div></AppShell>;
}
