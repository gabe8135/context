import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";

export async function getProjectPages(projectId) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("project_pages")
    .select("id,parent_id,title,slug,content,position,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error && ["42P01", "PGRST205"].includes(error.code)) return [];
  if (error) throw error;
  return data || [];
}

export async function getProjectPage(projectId, pageId) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase
    .from("project_pages")
    .select("id,parent_id,title,slug,content,position,created_at,updated_at")
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .is("archived_at", null)
    .single();
  if (error?.code === "PGRST116") notFound();
  if (error) throw error;
  return data;
}
