"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { projectPayload, slugify } from "@/lib/validations/project";

function fail(path, error) {
  redirect(`${path}?erro=${encodeURIComponent(error?.issues?.[0]?.message || error?.message || "Não foi possível salvar o projeto.")}`);
}

export async function createProjectAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  let values;
  try { values = projectPayload(formData); } catch (error) { fail("/app/projetos/novo", error); }
  let slug = slugify(values.name);
  const { data: exists } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).eq("slug", slug).maybeSingle();
  if (exists) slug = `${slug}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await supabase.from("projects").insert({ ...values, slug, workspace_id: workspaceId, created_by: user.id, last_activity_at: new Date().toISOString() }).select("slug").single();
  if (error) fail("/app/projetos/novo", error);
  revalidatePath("/app/projetos");
  redirect(`/app/projetos/${data.slug}?sucesso=Projeto criado`);
}

export async function updateProjectAction(id, formData) {
  const { supabase, workspaceId } = await requireWorkspace();
  let values;
  try { values = projectPayload(formData); } catch (error) { fail(`/app/projetos/${formData.get("current_slug")}/editar`, error); }
  delete values.current_slug;
  const { data, error } = await supabase.from("projects").update(values).eq("id", id).eq("workspace_id", workspaceId).select("slug").single();
  if (error) fail(`/app/projetos/${formData.get("current_slug")}/editar`, error);
  revalidatePath("/app/projetos");
  revalidatePath(`/app/projetos/${data.slug}`);
  redirect(`/app/projetos/${data.slug}?sucesso=Projeto atualizado`);
}

export async function archiveProjectAction(id) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data: project, error: findError } = await supabase.from("projects").select("id,name,slug,client_id").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (findError) throw findError;
  const archivedAt = new Date().toISOString();
  const { error } = await supabase.from("projects").update({ archived_at: archivedAt, status: "archived", last_activity_at: archivedAt }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: project.id, client_id: project.client_id, type: "project_archived", description: `Projeto arquivado: ${project.name}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app");
  revalidatePath("/app/projetos");
  revalidatePath("/app/arquivados");
  revalidatePath(`/app/projetos/${project.slug}`);
  redirect("/app/projetos?sucesso=Projeto arquivado");
}

export async function restoreProjectAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: project, error: findError } = await supabase.from("projects").select("id,client_id").eq("id", id).eq("workspace_id", workspaceId).not("archived_at", "is", null).single();
  if (findError) throw findError;
  const { data: client, error: clientError } = await supabase.from("clients").select("id").eq("id", project.client_id).eq("workspace_id", workspaceId).is("archived_at", null).maybeSingle();
  if (clientError) throw clientError;
  if (!client) redirect("/app/arquivados?erro=Desarquive o cliente antes de restaurar o projeto");
  const { error } = await supabase.from("projects").update({ archived_at: null, status: "active", last_activity_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath("/app");
  revalidatePath("/app/projetos");
  revalidatePath("/app/financeiro");
  revalidatePath("/app/arquivados");
  redirect("/app/arquivados?sucesso=Projeto restaurado");
}

export async function deleteProjectAction(id) {
  const { supabase, workspaceId, role } = await requireWorkspace();
  if (!['owner', 'admin'].includes(role)) redirect("/app/arquivados?erro=Apenas administradores podem excluir projetos definitivamente");

  const { data: project, error: findError } = await supabase.from("projects").select("id,name").eq("id", id).eq("workspace_id", workspaceId).not("archived_at", "is", null).single();
  if (findError) redirect("/app/arquivados?erro=Arquive o projeto antes de excluí-lo definitivamente");

  const dependentTables = [
    "tasks", "decisions", "alerts", "financial_entries", "domains", "hosting_accounts", "integrations",
    "notes", "meetings", "inbox_items", "procedures", "deliverables", "credentials", "files",
    "dns_records", "ssl_certificates", "email_services", "calendar_events",
  ];
  const checks = await Promise.all([
    ...dependentTables.map((table) => supabase.from(table).select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("project_id", id)),
    supabase.from("entity_relations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("source_type", "project").eq("source_id", id),
    supabase.from("entity_relations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("target_type", "project").eq("target_id", id),
    supabase.from("entity_tags").select("entity_id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("entity_type", "project").eq("entity_id", id),
  ]);
  const checkError = checks.find((result) => result.error)?.error;
  if (checkError) throw checkError;
  const relatedItems = checks.reduce((total, result) => total + (result.count || 0), 0);
  if (relatedItems > 0) redirect(`/app/arquivados?erro=${encodeURIComponent(`O projeto “${project.name}” possui ${relatedItems} registro(s) relacionado(s). Por segurança, mantenha-o arquivado.`)}`);

  const { error: activityError } = await supabase.from("activities").delete().eq("workspace_id", workspaceId).eq("project_id", id);
  if (activityError) throw activityError;
  const { error: deleteError } = await supabase.from("projects").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (deleteError) throw deleteError;

  revalidatePath("/app");
  revalidatePath("/app/projetos");
  revalidatePath("/app/arquivados");
  redirect("/app/arquivados?sucesso=Projeto excluído definitivamente");
}
