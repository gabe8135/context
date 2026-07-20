"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { parseMoneyCents, extractDomain } from "@/lib/import-parser";

export async function confirmImportAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const projectId = String(formData.get("project_id") || "") || null;
  let project = null;
  if (projectId) {
    const result = await supabase.from("projects").select("client_id,slug").eq("id", projectId).eq("workspace_id", workspaceId).single();
    if (result.error) throw result.error;
    project = result.data;
  }
  let items;
  try { items = JSON.parse(String(formData.get("items") || "[]")); } catch { redirect("/app/organizar?erro=Revisão inválida"); }
  if (!Array.isArray(items) || !items.length) redirect("/app/organizar?erro=Selecione ao menos um item");
  if (!project && items.some((item) => !["task", "note"].includes(item.type))) redirect("/app/organizar?erro=Na agenda pessoal confirme somente tarefas e notas");
  const common = { workspace_id: workspaceId, project_id: projectId, client_id: project?.client_id || null, created_by: user.id };
  let imported = 0;
  for (const item of items.slice(0, 150)) {
    const content = String(item.content || "").trim(); const title = String(item.title || content).trim();
    if (content.length < 2) continue;
    let result;
    if (item.type === "task") { const completed = item.status === "completed"; result = await supabase.from("tasks").insert({ ...common, title: title.slice(0, 180), description: content, status: completed ? "completed" : "todo", priority: item.priority || "medium", due_at: item.due_at || null, completed_at: completed ? new Date().toISOString() : null }); }
    else if (item.type === "decision") result = await supabase.from("decisions").insert({ ...common, title: title.slice(0, 180), content, status: "current", responsible_name: user.email });
    else if (item.type === "procedure") result = await supabase.from("procedures").insert({ ...common, title: title.slice(0, 180), description: content, steps: content, status: "active" });
    else if (["income", "expense"].includes(item.type)) { const amount = Number(item.amount_cents) || parseMoneyCents(content); if (!amount) continue; result = await supabase.from("financial_entries").insert({ ...common, description: title.slice(0, 180), entry_type: item.type, status: item.status === "paid" ? "paid" : "pending", amount_cents: amount, paid_at: item.status === "paid" ? new Date().toISOString().slice(0, 10) : null, notes: content }); }
    else if (item.type === "domain") { const value = extractDomain(content); if (!value) continue; result = await supabase.from("domains").insert({ ...common, domain: value, status: "unverified", notes: content }); }
    else result = await supabase.from("notes").insert({ ...common, title: title.slice(0, 100), content, status: item.status === "historical" ? "historical" : "active" });
    if (result.error) throw result.error;
    imported += 1;
  }
  await supabase.from("activities").insert({ ...common, type: "structured_import", description: `Importação concluída: ${imported} itens`, actor_id: user.id, actor_name: user.email });
  revalidatePath("/app"); revalidatePath("/app/tarefas"); revalidatePath("/app/notas");
  if (project) redirect(`/app/projetos/${project.slug}?sucesso=${imported} itens importados`);
  redirect(`/app?sucesso=${imported} itens pessoais organizados`);
}
