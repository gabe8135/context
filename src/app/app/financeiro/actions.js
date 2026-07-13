"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { financialPayload } from "@/lib/validations/financial";

function fail(path, error) {
  redirect(`${path}${path.includes("?") ? "&" : "?"}erro=${encodeURIComponent(error?.issues?.[0]?.message || error?.message || "Não foi possível salvar o lançamento.")}`);
}

export async function createFinancialEntryAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  let values;
  try { values = financialPayload(formData); } catch (error) { fail(`/app/financeiro/novo?projeto=${formData.get("project_slug") || ""}`, error); }
  const { data: project, error: projectError } = await supabase.from("projects").select("id,client_id,slug").eq("id", values.project_id).eq("workspace_id", workspaceId).single();
  if (projectError) fail("/app/financeiro/novo", projectError);
  const { error } = await supabase.from("financial_entries").insert({ ...values, workspace_id: workspaceId, client_id: project.client_id, created_by: user.id });
  if (error) fail(`/app/financeiro/novo?projeto=${project.slug}`, error);
  await Promise.all([
    supabase.from("projects").update({ last_activity_at: new Date().toISOString() }).eq("id", project.id).eq("workspace_id", workspaceId),
    supabase.from("activities").insert({ workspace_id: workspaceId, project_id: project.id, client_id: project.client_id, type: "financial_entry_created", description: `Lançamento registrado: ${values.description}`, actor_id: user.id, actor_name: user.email }),
  ]);
  revalidatePath(`/app/projetos/${project.slug}`);
  revalidatePath("/app/financeiro");
  redirect(`/app/projetos/${project.slug}?sucesso=Lançamento registrado`);
}

export async function updateFinancialEntryAction(id, formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  let values;
  try { values = financialPayload(formData); } catch (error) { fail(`/app/financeiro/${id}/editar`, error); }
  const [{ data: current, error: currentError }, { data: project, error: projectError }] = await Promise.all([
    supabase.from("financial_entries").select("project_id,client_id,projects(slug)").eq("id", id).eq("workspace_id", workspaceId).single(),
    supabase.from("projects").select("id,client_id,slug").eq("id", values.project_id).eq("workspace_id", workspaceId).single(),
  ]);
  if (currentError || projectError) fail(`/app/financeiro/${id}/editar`, currentError || projectError);
  const { error } = await supabase.from("financial_entries").update({ ...values, client_id: project.client_id, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) fail(`/app/financeiro/${id}/editar`, error);
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: project.id, client_id: project.client_id, type: "financial_entry_updated", description: `Lançamento atualizado: ${values.description}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app/financeiro");
  revalidatePath(`/app/projetos/${project.slug}`);
  if (current.projects?.slug && current.projects.slug !== project.slug) revalidatePath(`/app/projetos/${current.projects.slug}`);
  redirect("/app/financeiro?sucesso=Lançamento atualizado");
}

export async function cancelFinancialEntryAction(id) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data: entry, error } = await supabase.from("financial_entries").select("project_id,description,client_id,projects(slug)").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  const { error: updateError } = await supabase.from("financial_entries").update({ status: "cancelled" }).eq("id", id).eq("workspace_id", workspaceId);
  if (updateError) throw updateError;
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: entry.project_id, client_id: entry.client_id, type: "financial_entry_cancelled", description: `Lançamento cancelado: ${entry.description}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app/financeiro");
  revalidatePath(`/app/projetos/${entry.projects?.slug}`);
}

export async function deleteFinancialEntryAction(id) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data: entry, error } = await supabase.from("financial_entries").select("project_id,client_id,description,status,paid_amount_cents,projects(slug)").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  if (Number(entry.paid_amount_cents || 0) > 0 || entry.status === "paid" || entry.status === "partially_paid") redirect("/app/financeiro?erro=Um lançamento com pagamento registrado não pode ser excluído. Cancele-o para preservar o histórico financeiro.");
  const { error: deleteError } = await supabase.from("financial_entries").delete().eq("id", id).eq("workspace_id", workspaceId);
  if (deleteError) throw deleteError;
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: entry.project_id, client_id: entry.client_id, type: "financial_entry_deleted", description: `Lançamento excluído: ${entry.description}`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app/financeiro");
  if (entry.projects?.slug) revalidatePath(`/app/projetos/${entry.projects.slug}`);
  redirect("/app/financeiro?sucesso=Lançamento excluído definitivamente");
}
