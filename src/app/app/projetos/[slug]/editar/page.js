import Link from "next/link";
import { Archive } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ProjectForm } from "@/components/project-form";
import { requireWorkspace } from "@/lib/auth-context";
import { archiveProjectAction, updateProjectAction } from "../../actions";

export default async function EditProject({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [{ data: project, error }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*").eq("workspace_id", workspaceId).eq("slug", slug).is("archived_at", null).single(),
    supabase.from("clients").select("id,name").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
  ]);
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  return <AppShell><div className="content narrow"><Link className="back-link" href={`/app/projetos/${slug}`}>← {project.name}</Link><div className="eyebrow">Editar projeto</div><h1 className="page-title">{project.name}</h1><ProjectForm clients={clients || []} project={project} action={updateProjectAction.bind(null, project.id)} submitLabel="Salvar alterações" error={query.erro}/><section className="danger-zone"><div><strong>Arquivar projeto</strong><p>Remove o projeto da operação ativa, mas preserva tarefas, finanças, arquivos e histórico.</p></div><form action={archiveProjectAction.bind(null, project.id)}><ConfirmSubmitButton message={`Arquivar o projeto “${project.name}”? Os dados serão preservados.`}><Archive size={14}/> Arquivar projeto</ConfirmSubmitButton></form></section></div></AppShell>;
}
