import { AppShell } from "@/components/app-shell";
import { AssistantChat } from "@/components/assistant-chat";
import { requireWorkspace } from "@/lib/auth-context";
import { confirmAssistantProposalAction } from "./actions";

export const dynamic = "force-dynamic";
export default async function AssistantPage({ searchParams }) {
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: projects, error } = await supabase.from("projects").select("id,name,slug,client_id,clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("name");
  if (error) throw error;
  let context = { type: "general", name: "Visão geral" };
  if (query.projeto) {
    const project = projects.find((item) => item.slug === query.projeto);
    if (project) context = { type: "project", ...project };
  } else if (query.cliente) {
    const { data: client } = await supabase.from("clients").select("id,name,projects(id,name,slug)").eq("workspace_id", workspaceId).eq("id", query.cliente).is("archived_at", null).maybeSingle();
    if (client) context = { type: "client", ...client };
  }
  const available = context.type === "project" ? projects.filter((item) => item.id === context.id) : context.type === "client" ? projects.filter((item) => item.client_id === context.id) : projects;
  return <AppShell context={context.type === "general" ? null : context}><div className="content"><div className="eyebrow">Inteligência com contexto</div><h1 className="page-title">Assistente Squire</h1><p className="subtitle">Consulte seus dados e transforme conversas em propostas revisáveis.</p><AssistantChat context={context} projects={available} confirmAction={confirmAssistantProposalAction} success={query.sucesso} error={query.erro}/></div></AppShell>;
}
