export async function getActiveContextIds(supabase, workspaceId) {
  const { data: clients, error: clientError } = await supabase.from("clients").select("id").eq("workspace_id", workspaceId).is("archived_at", null);
  if (clientError) throw clientError;
  const clientIds = (clients || []).map((client) => client.id);
  if (!clientIds.length) return { clientIds: [], projectIds: [] };
  const { data: projects, error: projectError } = await supabase.from("projects").select("id").eq("workspace_id", workspaceId).is("archived_at", null).in("client_id", clientIds);
  if (projectError) throw projectError;
  return { clientIds, projectIds: (projects || []).map((project) => project.id) };
}
