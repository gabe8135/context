"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { taskPayload } from "@/lib/validations/task";

async function recalculate(supabase, workspaceId, projectId) {
  if (!projectId) return;
  const { data } = await supabase.from("tasks").select("status").eq("workspace_id", workspaceId).eq("project_id", projectId).is("archived_at", null).not("status", "in", "(cancelled,archived)");
  const total = data?.length || 0;
  const done = data?.filter((task) => task.status === "completed").length || 0;
  await supabase.from("projects").update({ progress: total ? Math.round(done / total * 100) : 0, last_activity_at: new Date().toISOString() }).eq("id", projectId).eq("workspace_id", workspaceId);
}

function fail(path, error) {
  redirect(`${path}?erro=${encodeURIComponent(error?.issues?.[0]?.message || error?.message || "Não foi possível salvar a tarefa.")}`);
}

async function findProject(supabase, workspaceId, projectId) {
  if (!projectId) return null;
  const { data, error } = await supabase.from("projects").select("id,client_id,slug").eq("id", projectId).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  return data;
}

export async function createTaskAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  let value;
  try { value = taskPayload(formData); } catch (error) { fail(`/app/tarefas/nova?projeto=${formData.get("project_slug") || ""}`, error); }
  let project;
  try { project = await findProject(supabase, workspaceId, value.project_id); } catch (error) { fail("/app/tarefas/nova", error); }
  const { error } = await supabase.from("tasks").insert({ ...value, workspace_id: workspaceId, client_id: project?.client_id || null, created_by: user.id });
  if (error) fail(`/app/tarefas/nova${project ? `?projeto=${project.slug}` : ""}`, error);
  await recalculate(supabase, workspaceId, project?.id);
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: project?.id || null, client_id: project?.client_id || null, type: "task_created", description: `Tarefa criada: ${value.title}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app"); revalidatePath("/app/tarefas");
  if (project) { revalidatePath(`/app/projetos/${project.slug}`); redirect(`/app/projetos/${project.slug}?sucesso=Tarefa criada`); }
  redirect("/app?sucesso=Tarefa pessoal criada");
}

export async function toggleTaskAction(id, projectId, slug) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data: task, error } = await supabase.from("tasks").select("title,status,client_id,project_id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  const completed = task.status !== "completed";
  const { error: updateError } = await supabase.from("tasks").update({ status: completed ? "completed" : "todo", completed_at: completed ? new Date().toISOString() : null }).eq("id", id).eq("workspace_id", workspaceId);
  if (updateError) throw updateError;
  await recalculate(supabase, workspaceId, task.project_id || projectId);
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: task.project_id, client_id: task.client_id, type: completed ? "task_completed" : "task_reopened", description: `Tarefa ${completed ? "concluída" : "reaberta"}: ${task.title}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app"); revalidatePath("/app/tarefas"); if (slug) revalidatePath(`/app/projetos/${slug}`);
}

export async function updateTaskAction(id, formData) {
  const { supabase, workspaceId } = await requireWorkspace();
  let value;
  try { value = taskPayload(formData); } catch (error) { fail(`/app/tarefas/${id}`, error); }
  const { data: task, error: findError } = await supabase.from("tasks").select("project_id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (findError) throw findError;
  const project = await findProject(supabase, workspaceId, value.project_id);
  const { error } = await supabase.from("tasks").update({ ...value, client_id: project?.client_id || null, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  await Promise.all([recalculate(supabase, workspaceId, task.project_id), recalculate(supabase, workspaceId, value.project_id)]);
  revalidatePath("/app"); revalidatePath("/app/tarefas"); redirect(`/app/tarefas/${id}?sucesso=Tarefa atualizada`);
}

export async function archiveTaskAction(id, slug = null) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: task, error } = await supabase.from("tasks").select("project_id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  await supabase.from("tasks").update({ archived_at: new Date().toISOString(), status: "cancelled" }).eq("id", id).eq("workspace_id", workspaceId);
  await recalculate(supabase, workspaceId, task.project_id);
  revalidatePath("/app"); revalidatePath("/app/tarefas");
  if (slug) { revalidatePath(`/app/projetos/${slug}`); redirect(`/app/projetos/${slug}?sucesso=Tarefa arquivada`); }
  redirect("/app/tarefas?sucesso=Tarefa arquivada");
}

export async function restoreTaskAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: task, error } = await supabase.from("tasks").select("project_id").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  const { error: updateError } = await supabase.from("tasks").update({ archived_at: null, status: "todo", completed_at: null }).eq("id", id).eq("workspace_id", workspaceId);
  if (updateError) throw updateError;
  await recalculate(supabase, workspaceId, task.project_id);
  revalidatePath("/app"); revalidatePath("/app/tarefas"); revalidatePath("/app/arquivados"); redirect("/app/arquivados?sucesso=Tarefa desarquivada");
}

export async function deleteTaskAction(id, slug = "") {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data: task, error } = await supabase.from("tasks").select("project_id,client_id,title,projects(slug)").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  const cleanups = await Promise.all([
    supabase.from("entity_relations").delete().eq("workspace_id", workspaceId).eq("source_type", "task").eq("source_id", id),
    supabase.from("entity_relations").delete().eq("workspace_id", workspaceId).eq("target_type", "task").eq("target_id", id),
    supabase.from("entity_tags").delete().eq("workspace_id", workspaceId).eq("entity_type", "task").eq("entity_id", id),
    supabase.from("calendar_events").delete().eq("workspace_id", workspaceId).eq("source_type", "task").eq("source_id", id),
  ]);
  const cleanupError = cleanups.find((result) => result.error)?.error;
  if (cleanupError) throw cleanupError;
  const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (deleteError) throw deleteError;
  await recalculate(supabase, workspaceId, task.project_id);
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: task.project_id, client_id: task.client_id, type: "task_deleted", description: `Tarefa excluída: ${task.title}`, actor_id: user.id, actor_name: user.email });
  const target = slug || task.projects?.slug;
  revalidatePath("/app"); revalidatePath("/app/tarefas"); revalidatePath("/app/arquivados");
  if (target) { revalidatePath(`/app/projetos/${target}`); redirect(`/app/tarefas?projeto=${target}&sucesso=Tarefa excluída definitivamente`); }
  redirect("/app/tarefas?sucesso=Tarefa excluída definitivamente");
}
