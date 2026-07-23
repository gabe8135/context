"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";

const text = (formData, key) => String(formData.get(key) || "").trim();
const optional = (formData, key) => formData.get(key) || null;

export async function createMeetingAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const projectId = text(formData, "project_id");
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("client_id,slug")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single();
  if (projectError) throw projectError;

  const title = text(formData, "title");
  const { error } = await supabase.from("meetings").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    client_id: project.client_id,
    title,
    scheduled_at: text(formData, "scheduled_at"),
    reminder_at: optional(formData, "reminder_at"),
    participants: text(formData, "participants"),
    agenda: text(formData, "agenda"),
    notes: text(formData, "notes"),
    summary: text(formData, "summary"),
    next_meeting_at: optional(formData, "next_meeting_at"),
    created_by: user.id,
  });
  if (error) throw error;

  await supabase.from("activities").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    client_id: project.client_id,
    type: "meeting_created",
    description: `Reunião registrada: ${title}`,
    actor_id: user.id,
    actor_name: user.email,
  });
  revalidatePath("/app/reunioes");
  redirect(`/app/projetos/${project.slug}?sucesso=Reunião registrada`);
}

export async function updateMeetingAction(id, formData) {
  const { supabase, workspaceId } = await requireWorkspace();
  const payload = {
    title: text(formData, "title"),
    scheduled_at: text(formData, "scheduled_at"),
    reminder_at: optional(formData, "reminder_at"),
    participants: text(formData, "participants"),
    agenda: text(formData, "agenda"),
    notes: text(formData, "notes"),
    summary: text(formData, "summary"),
    next_meeting_at: optional(formData, "next_meeting_at"),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("meetings").update(payload).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath("/app/reunioes");
  redirect(`/app/reunioes/${id}?sucesso=Reunião atualizada`);
}

export async function archiveMeetingAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { error } = await supabase.from("meetings")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath("/app/reunioes");
  redirect("/app/reunioes?sucesso=Reunião arquivada");
}
