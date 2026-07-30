"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";

async function projectForSlug(supabase, workspaceId, slug) {
  const { data, error } = await supabase.from("projects").select("id,slug").eq("workspace_id", workspaceId).eq("slug", slug).single();
  if (error) throw error;
  return data;
}

export async function enableProjectShareAction(slug) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const project = await projectForSlug(supabase, workspaceId, slug);
  const { error } = await supabase.from("project_public_shares").upsert({
    workspace_id: workspaceId, project_id: project.id, active: true, expires_at: null, created_by: user.id,
  }, { onConflict: "workspace_id,project_id" });
  if (error) throw error;
  revalidatePath(`/app/projetos/${slug}/compartilhar`);
  redirect(`/app/projetos/${slug}/compartilhar?sucesso=Link seguro ativado`);
}

export async function disableProjectShareAction(slug) {
  const { supabase, workspaceId } = await requireWorkspace();
  const project = await projectForSlug(supabase, workspaceId, slug);
  const { error } = await supabase.from("project_public_shares").update({ active: false }).eq("workspace_id", workspaceId).eq("project_id", project.id);
  if (error) throw error;
  revalidatePath(`/app/projetos/${slug}/compartilhar`);
  redirect(`/app/projetos/${slug}/compartilhar?sucesso=Compartilhamento desativado`);
}

export async function renewProjectShareAction(slug) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const project = await projectForSlug(supabase, workspaceId, slug);
  const { error: deleteError } = await supabase.from("project_public_shares").delete().eq("workspace_id", workspaceId).eq("project_id", project.id);
  if (deleteError) throw deleteError;
  const { error } = await supabase.from("project_public_shares").insert({ workspace_id: workspaceId, project_id: project.id, active: true, created_by: user.id });
  if (error) throw error;
  revalidatePath(`/app/projetos/${slug}/compartilhar`);
  redirect(`/app/projetos/${slug}/compartilhar?sucesso=Novo link gerado`);
}
