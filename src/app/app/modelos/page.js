import { AppShell } from "@/components/app-shell";
import { requireWorkspace } from "@/lib/auth-context";
import { applySmartTemplateAction, applyTemplateAction, createTemplateAction } from "./actions";
import { SMART_TEMPLATE_INFO } from "@/lib/smart-project-templates";

export default async function Templates({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data: templates, error }, { data: clients }] = await Promise.all([
    supabase.from("project_templates").select("*,project_template_items(id)").eq("workspace_id", workspaceId).eq("active", true).order("name"),
    supabase.from("clients").select("id,name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
  ]);
  if (error) throw error;
  return <AppShell><div className="content templates-page"><div className="eyebrow">Repetir sem retrabalho</div><h1 className="page-title">Modelos inteligentes</h1><p className="subtitle">Crie projetos com etapas, ordem e dependências coerentes desde o primeiro minuto.</p>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}
    <section className="smart-template-grid">{SMART_TEMPLATE_INFO.map(([key, name, duration, description]) => <article className="panel smart-template-card" key={key}><div><span className="badge">{duration}</span><h2>{name}</h2><p>{description}</p></div><form action={applySmartTemplateAction.bind(null, key)}><select name="client_id" required><option value="">Escolha o cliente</option>{clients?.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select><input name="project_name" required placeholder="Nome do novo projeto"/><button className="btn primary">Criar projeto estruturado</button></form></article>)}</section>
    <div className="dashboard-grid"><form action={createTemplateAction} className="panel form-panel"><header className="panel-head"><div className="panel-title">Criar modelo próprio</div></header><div className="form-grid"><label className="field"><span>Nome</span><input name="name" required/></label><label className="field"><span>Duração em dias</span><input name="default_duration_days" type="number" min="1"/></label><label className="field"><span>Prioridade</span><select name="default_priority"><option value="medium">Média</option><option value="high">Alta</option><option value="low">Baixa</option></select></label><label className="field full"><span>Descrição</span><textarea name="description" rows="3"/></label><label className="field full"><span>Tarefas, uma por linha</span><textarea name="tasks" rows="8"/></label></div><button className="btn primary">Criar modelo</button></form>
    <section className="panel"><header className="panel-head"><div className="panel-title">Meus modelos</div><span className="badge">{templates?.length || 0}</span></header>{templates?.map((template) => <div className="item" key={template.id}><div className="item-main"><b>{template.name}</b><div className="meta">{template.project_template_items?.length || 0} tarefas · {template.default_duration_days || "sem prazo"}</div></div><form action={applyTemplateAction.bind(null, template.id)} className="inline-form"><select name="client_id" required><option value="">Cliente</option>{clients?.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select><input name="project_name" required placeholder="Novo projeto"/><button className="btn">Usar modelo</button></form></div>)}{!templates?.length && <div className="empty">Nenhum modelo próprio criado.</div>}</section></div>
  </div></AppShell>;
}
