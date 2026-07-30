"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { sanitizeRichDocument } from "@/lib/rich-document";
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

export async function saveProjectDocumentationAction(id, slug, content) {
  const { supabase, workspaceId } = await requireWorkspace();
  const documentation = sanitizeRichDocument(String(content || "").replace(/\r\n/g, "\n"));
  if (documentation.length > 120000) {
    return { ok: false, message: "O documento ultrapassou o limite de 120 mil caracteres." };
  }

  const savedAt = new Date().toISOString();
  const { error } = await supabase
    .from("projects")
    .update({
      documentation_content: documentation,
      documentation_updated_at: savedAt,
      last_activity_at: savedAt,
    })
    .eq("id", id)
    .eq("slug", slug)
    .eq("workspace_id", workspaceId)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message || "Não foi possível salvar o documento." };
  revalidatePath(`/app/projetos/${slug}`);
  return { ok: true, message: "Documento salvo.", updatedAt: savedAt };
}

export async function createProjectPageAction(projectId, projectSlug, parentId, title) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const pageTitle = String(title || "").trim().slice(0, 120) || "Sem título";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,slug")
    .eq("id", projectId)
    .eq("slug", projectSlug)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .single();
  if (projectError || !project) return { ok: false, message: "Projeto não encontrado." };

  let parent = null;
  if (parentId) {
    const result = await supabase
      .from("project_pages")
      .select("id")
      .eq("id", parentId)
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .is("archived_at", null)
      .single();
    if (result.error) return { ok: false, message: "A página superior não pertence a este projeto." };
    parent = result.data.id;
  }

  let siblingQuery = supabase
    .from("project_pages")
    .select("position")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .is("archived_at", null);
  siblingQuery = parent
    ? siblingQuery.eq("parent_id", parent)
    : siblingQuery.is("parent_id", null);
  const { data: siblings, error: positionError } = await siblingQuery
    .order("position", { ascending: false })
    .limit(1);
  if (positionError) return { ok: false, message: positionError.message };

  let pageSlug = slugify(pageTitle) || "pagina";
  pageSlug = `${pageSlug}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase.from("project_pages").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    parent_id: parent,
    title: pageTitle,
    slug: pageSlug,
    position: (siblings?.[0]?.position ?? -1) + 1,
    created_by: user.id,
  }).select("id,title").single();

  if (error) return { ok: false, message: error.message || "Não foi possível criar a página." };
  revalidatePath(`/app/projetos/${projectSlug}/documento`);
  return {
    ok: true,
    page: data,
    viewHref: `/app/projetos/${projectSlug}/documento/${data.id}`,
    href: `/app/projetos/${projectSlug}/documento/${data.id}?editar=1`,
  };
}

export async function saveProjectPageAction(pageId, projectId, projectSlug, title, content) {
  const { supabase, workspaceId } = await requireWorkspace();
  const pageTitle = String(title || "").trim().slice(0, 120) || "Sem título";
  const clean = sanitizeRichDocument(String(content || "").replace(/\r\n/g, "\n"));
  if (clean.length > 120000) return { ok: false, message: "A página ultrapassou o limite de 120 mil caracteres." };

  const { data, error } = await supabase.from("project_pages").update({
    title: pageTitle,
    content: clean,
  })
    .eq("id", pageId)
    .eq("project_id", projectId)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .select("id,title,updated_at")
    .single();

  if (error || !data) return { ok: false, message: error?.message || "Página não encontrada." };
  revalidatePath(`/app/projetos/${projectSlug}/documento`);
  revalidatePath(`/app/projetos/${projectSlug}/documento/${pageId}`);
  return { ok: true, message: "Página salva.", title: data.title, updatedAt: data.updated_at };
}

export async function archiveProjectPageAction(pageId, projectId, projectSlug) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { error } = await supabase.from("project_pages").update({
    archived_at: new Date().toISOString(),
  })
    .eq("id", pageId)
    .eq("project_id", projectId)
    .eq("workspace_id", workspaceId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/app/projetos/${projectSlug}/documento`);
  return { ok: true, href: `/app/projetos/${projectSlug}/documento` };
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
