import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireWorkspace() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .single();
  if (error || !membership) throw new Error("Workspace do usuário não encontrado.");
  return { supabase, user, workspaceId: membership.workspace_id, role: membership.role };
}
