"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";
import { parseMoneyCents, extractDomain } from "@/lib/import-parser";

const organizedItemSchema = z.object({
  type: z.enum(["task", "note", "decision", "procedure", "income", "expense", "domain"]),
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().min(2).max(10000),
  status: z.string().optional().default("active"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  due_at: z.string().nullable().optional(),
  amount_cents: z.number().int().nullable().optional(),
});

const saveSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  items: z.array(organizedItemSchema).min(1).max(30),
});

async function resolveProject(supabase, workspaceId, projectId) {
  if (!projectId) return null;
  const { data, error } = await supabase.from("projects")
    .select("id,client_id,slug")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .single();
  if (error) throw new Error("O projeto selecionado não pertence ao seu workspace.");
  return data;
}

async function persistOrganizedItems({ supabase, user, workspaceId, project, projectId, items }) {
  if (!project && items.some((item) => !["task", "note"].includes(item.type))) {
    throw new Error("Na agenda pessoal confirme somente tarefas e notas.");
  }
  const common = { workspace_id: workspaceId, project_id: projectId, client_id: project?.client_id || null, created_by: user.id };
  let imported = 0;
  for (const item of items) {
    const content = item.content.trim();
    const title = item.title.trim();
    let result;
    if (item.type === "task") {
      const completed = item.status === "completed";
      result = await supabase.from("tasks").insert({ ...common, title, description: content, status: completed ? "completed" : "todo", priority: item.priority, due_at: item.due_at || null, completed_at: completed ? new Date().toISOString() : null });
    } else if (item.type === "decision") {
      result = await supabase.from("decisions").insert({ ...common, title, content, status: "current", responsible_name: user.email });
    } else if (item.type === "procedure") {
      result = await supabase.from("procedures").insert({ ...common, title, description: content, steps: content, status: "active" });
    } else if (["income", "expense"].includes(item.type)) {
      const amount = Number(item.amount_cents) || parseMoneyCents(content);
      if (!amount) continue;
      result = await supabase.from("financial_entries").insert({ ...common, description: title, entry_type: item.type, status: item.status === "paid" ? "paid" : "pending", amount_cents: amount, paid_at: item.status === "paid" ? new Date().toISOString().slice(0, 10) : null, notes: content });
    } else if (item.type === "domain") {
      const value = extractDomain(content);
      if (!value) continue;
      result = await supabase.from("domains").insert({ ...common, domain: value, status: "unverified", notes: content });
    } else {
      result = await supabase.from("notes").insert({ ...common, title: title.slice(0, 100), content, status: item.status === "historical" ? "historical" : "active" });
    }
    if (result.error) throw result.error;
    imported += 1;
  }
  if (!imported) throw new Error("Nenhum item válido foi encontrado para salvar.");
  await supabase.from("activities").insert({ ...common, type: "structured_import", description: `Importação concluída: ${imported} itens`, actor_id: user.id, actor_name: user.email });
  return imported;
}

export async function saveOrganizedItemsAction(input) {
  try {
    const values = saveSchema.parse(input);
    const { supabase, user, workspaceId } = await requireWorkspace();
    const project = await resolveProject(supabase, workspaceId, values.projectId || null);
    const imported = await persistOrganizedItems({ supabase, user, workspaceId, project, projectId: project?.id || null, items: values.items });
    revalidatePath("/app");
    revalidatePath("/app/tarefas");
    revalidatePath("/app/notas");
    if (project) revalidatePath(`/app/projetos/${project.slug}`);
    return { ok: true, imported };
  } catch (error) {
    return { ok: false, error: error?.issues?.[0]?.message || error.message || "Não foi possível salvar as sugestões." };
  }
}

export async function confirmImportAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const projectId = String(formData.get("project_id") || "") || null;
  const project = await resolveProject(supabase, workspaceId, projectId);
  let items;
  try { items = JSON.parse(String(formData.get("items") || "[]")); } catch { redirect("/app/organizar?erro=Revisão inválida"); }
  const parsed = saveSchema.parse({ projectId, items });
  const imported = await persistOrganizedItems({ supabase, user, workspaceId, project, projectId, items: parsed.items });
  revalidatePath("/app"); revalidatePath("/app/tarefas"); revalidatePath("/app/notas");
  if (project) redirect(`/app/projetos/${project.slug}?sucesso=${imported} itens importados`);
  redirect(`/app?sucesso=${imported} itens pessoais organizados`);
}
